
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Habits
CREATE TABLE public.habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  target_days INT NOT NULL DEFAULT 30,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habits TO authenticated;
GRANT ALL ON public.habits TO service_role;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View public habits or own" ON public.habits FOR SELECT TO authenticated USING (is_public OR owner_id = auth.uid());
CREATE POLICY "Create own habits" ON public.habits FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Update own habits" ON public.habits FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Delete own habits" ON public.habits FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Check-ins
CREATE TABLE public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(habit_id, user_id, check_in_date)
);
GRANT SELECT, INSERT, DELETE ON public.check_ins TO authenticated;
GRANT ALL ON public.check_ins TO service_role;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own check-ins" ON public.check_ins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Insert own check-ins" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Streaks
CREATE TABLE public.streaks (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_check_in DATE,
  PRIMARY KEY (user_id, habit_id)
);
GRANT SELECT, INSERT, UPDATE ON public.streaks TO authenticated;
GRANT ALL ON public.streaks TO service_role;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own streaks" ON public.streaks FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Groups (milestone clubs)
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'milestone',
  threshold INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.groups TO authenticated, anon;
GRANT ALL ON public.groups TO service_role;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Groups are public" ON public.groups FOR SELECT USING (true);

-- Group memberships
CREATE TABLE public.group_memberships (
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
GRANT SELECT ON public.group_memberships TO authenticated;
GRANT ALL ON public.group_memberships TO service_role;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view memberships of their groups" ON public.group_memberships FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_memberships gm WHERE gm.group_id = group_memberships.group_id AND gm.user_id = auth.uid()));

-- Group messages
CREATE TABLE public.group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'system',
  body TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.group_messages TO authenticated;
GRANT ALL ON public.group_messages TO service_role;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view messages" ON public.group_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.group_memberships gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));
CREATE POLICY "Members post messages" ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (SELECT 1 FROM public.group_memberships gm WHERE gm.group_id = group_messages.group_id AND gm.user_id = auth.uid()));

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own notifications" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Seed milestone groups
INSERT INTO public.groups (slug, name, kind, threshold) VALUES
  ('club-7', '7-Day Club', 'milestone', 7),
  ('club-30', '30-Day Club', 'milestone', 30),
  ('club-100', '100-Day Club', 'milestone', 100),
  ('club-365', '365-Day Club', 'milestone', 365);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic check-in: insert, recompute streak, detect milestone, join group, post message, fan out notifications
CREATE OR REPLACE FUNCTION public.perform_check_in(_habit_id UUID, _photo_url TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _user_id UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _habit RECORD;
  _streak RECORD;
  _new_current INT;
  _new_longest INT;
  _last DATE;
  _milestone INT := NULL;
  _group RECORD;
  _display TEXT;
  _msg TEXT;
  _payload JSONB;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _habit FROM public.habits WHERE id = _habit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Habit not found'; END IF;

  -- Insert (idempotent per day)
  INSERT INTO public.check_ins (habit_id, user_id, check_in_date, photo_url)
  VALUES (_habit_id, _user_id, _today, _photo_url)
  ON CONFLICT (habit_id, user_id, check_in_date) DO NOTHING;

  -- Compute streak
  SELECT * INTO _streak FROM public.streaks WHERE user_id = _user_id AND habit_id = _habit_id;
  _last := COALESCE(_streak.last_check_in, NULL);

  IF _last = _today THEN
    _new_current := COALESCE(_streak.current_streak, 1);
  ELSIF _last = _today - INTERVAL '1 day' THEN
    _new_current := COALESCE(_streak.current_streak, 0) + 1;
  ELSE
    _new_current := 1;
  END IF;

  _new_longest := GREATEST(_new_current, COALESCE(_streak.longest_streak, 0));

  INSERT INTO public.streaks (user_id, habit_id, current_streak, longest_streak, last_check_in)
  VALUES (_user_id, _habit_id, _new_current, _new_longest, _today)
  ON CONFLICT (user_id, habit_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_check_in = EXCLUDED.last_check_in;

  -- Milestone detection
  IF _new_current IN (7, 30, 100, 365) AND (_streak.current_streak IS NULL OR _streak.current_streak < _new_current) THEN
    _milestone := _new_current;
    SELECT * INTO _group FROM public.groups WHERE threshold = _milestone LIMIT 1;

    -- Join group
    INSERT INTO public.group_memberships (group_id, user_id)
    VALUES (_group.id, _user_id) ON CONFLICT DO NOTHING;

    SELECT COALESCE(display_name, username, 'Someone') INTO _display FROM public.profiles WHERE id = _user_id;
    _msg := '🔥 ' || _display || ' completed Day ' || _new_current || ' of their ' || _habit.title || ' streak!';
    _payload := jsonb_build_object('user_id', _user_id, 'habit_id', _habit_id, 'habit_title', _habit.title, 'streak', _new_current, 'group_slug', _group.slug);

    -- System message
    INSERT INTO public.group_messages (group_id, author_id, kind, body, payload)
    VALUES (_group.id, NULL, 'system', _msg, _payload);

    -- Fan out notifications to all members
    INSERT INTO public.notifications (user_id, kind, payload)
    SELECT gm.user_id, 'milestone', _payload || jsonb_build_object('message', _msg)
    FROM public.group_memberships gm WHERE gm.group_id = _group.id;
  END IF;

  RETURN jsonb_build_object(
    'newStreak', _new_current,
    'milestone', _milestone,
    'groupSlug', CASE WHEN _milestone IS NOT NULL THEN _group.slug ELSE NULL END,
    'groupName', CASE WHEN _milestone IS NOT NULL THEN _group.name ELSE NULL END,
    'message', CASE WHEN _milestone IS NOT NULL THEN _msg ELSE NULL END,
    'habitTitle', _habit.title
  );
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
