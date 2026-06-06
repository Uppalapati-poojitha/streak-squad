
DO $$ BEGIN
  CREATE TYPE habit_category AS ENUM ('coding','reading','gym','running','meditation','fasting','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_category_credits (
  user_id UUID NOT NULL, category habit_category NOT NULL,
  balance INT NOT NULL DEFAULT 0, lifetime INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, category)
);
GRANT SELECT ON public.user_category_credits TO authenticated;
GRANT ALL ON public.user_category_credits TO service_role;
ALTER TABLE public.user_category_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own category credits" ON public.user_category_credits;
CREATE POLICY "View own category credits" ON public.user_category_credits FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.bond_credits_ledger ADD COLUMN IF NOT EXISTS category habit_category;
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS category habit_category;

CREATE TABLE IF NOT EXISTS public.shields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('bronze','silver','gold')), category habit_category NOT NULL,
  cost_credits INT NOT NULL, missed_days_protected INT NOT NULL, validity_days INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shields TO authenticated, anon;
GRANT ALL ON public.shields TO service_role;
ALTER TABLE public.shields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Shields are public" ON public.shields;
CREATE POLICY "Shields are public" ON public.shields FOR SELECT TO public USING (true);

CREATE TABLE IF NOT EXISTS public.user_shields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL,
  shield_id UUID NOT NULL REFERENCES public.shields(id), category habit_category NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired')),
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ, used_for_habit_id UUID, used_for_date DATE
);
CREATE INDEX IF NOT EXISTS idx_user_shields_user ON public.user_shields(user_id, status);
GRANT SELECT ON public.user_shields TO authenticated;
GRANT ALL ON public.user_shields TO service_role;
ALTER TABLE public.user_shields ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own shields" ON public.user_shields;
CREATE POLICY "View own shields" ON public.user_shields FOR SELECT TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.group_messages(id) ON DELETE SET NULL;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS reactions JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id UUID NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view reactions" ON public.message_reactions;
CREATE POLICY "Members view reactions" ON public.message_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_messages gm JOIN public.group_memberships gms ON gms.group_id = gm.group_id
    WHERE gm.id = message_reactions.message_id AND gms.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Members add reactions" ON public.message_reactions;
CREATE POLICY "Members add reactions" ON public.message_reactions FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.group_messages gm JOIN public.group_memberships gms ON gms.group_id = gm.group_id
    WHERE gm.id = message_reactions.message_id AND gms.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Remove own reactions" ON public.message_reactions;
CREATE POLICY "Remove own reactions" ON public.message_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.club_feed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID, kind TEXT NOT NULL, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_club_feed_club ON public.club_feed_items(club_id, created_at DESC);
GRANT SELECT ON public.club_feed_items TO authenticated;
GRANT ALL ON public.club_feed_items TO service_role;
ALTER TABLE public.club_feed_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view club feed" ON public.club_feed_items;
CREATE POLICY "Members view club feed" ON public.club_feed_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_memberships gm WHERE gm.group_id = club_feed_items.club_id AND gm.user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.weekly_champions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, week_start DATE NOT NULL, metric TEXT NOT NULL,
  value NUMERIC NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, week_start, metric)
);
GRANT SELECT ON public.weekly_champions TO authenticated;
GRANT ALL ON public.weekly_champions TO service_role;
ALTER TABLE public.weekly_champions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view champions" ON public.weekly_champions;
CREATE POLICY "Members view champions" ON public.weekly_champions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.group_memberships gm WHERE gm.group_id = weekly_champions.club_id AND gm.user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL, description TEXT NOT NULL, icon TEXT NOT NULL DEFAULT 'trophy',
  tier TEXT NOT NULL DEFAULT 'bronze', reward_credits INT NOT NULL DEFAULT 0,
  reward_xp INT NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated, anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Achievements public" ON public.achievements;
CREATE POLICY "Achievements public" ON public.achievements FOR SELECT TO public USING (true);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id),
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (user_id, achievement_id)
);
GRANT SELECT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own achievements" ON public.user_achievements;
CREATE POLICY "View own achievements" ON public.user_achievements FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), mission_date DATE NOT NULL,
  kind TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
  target INT NOT NULL DEFAULT 1, reward_credits INT NOT NULL DEFAULT 10,
  reward_xp INT NOT NULL DEFAULT 25, category habit_category,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_missions_date ON public.daily_missions(mission_date);
GRANT SELECT ON public.daily_missions TO authenticated;
GRANT ALL ON public.daily_missions TO service_role;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Missions visible" ON public.daily_missions;
CREATE POLICY "Missions visible" ON public.daily_missions FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.user_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL,
  mission_id UUID NOT NULL REFERENCES public.daily_missions(id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0, completed_at TIMESTAMPTZ, claimed_at TIMESTAMPTZ,
  UNIQUE (user_id, mission_id)
);
GRANT SELECT, INSERT, UPDATE ON public.user_mission_progress TO authenticated;
GRANT ALL ON public.user_mission_progress TO service_role;
ALTER TABLE public.user_mission_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own progress" ON public.user_mission_progress;
CREATE POLICY "View own progress" ON public.user_mission_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Manage own progress" ON public.user_mission_progress;
CREATE POLICY "Manage own progress" ON public.user_mission_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Update own progress" ON public.user_mission_progress;
CREATE POLICY "Update own progress" ON public.user_mission_progress FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.daily_reward_box (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL,
  claim_date DATE NOT NULL, reward JSONB NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE (user_id, claim_date)
);
GRANT SELECT ON public.daily_reward_box TO authenticated;
GRANT ALL ON public.daily_reward_box TO service_role;
ALTER TABLE public.daily_reward_box ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own box" ON public.daily_reward_box;
CREATE POLICY "View own box" ON public.daily_reward_box FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.feed_likes (
  feed_item_id UUID NOT NULL REFERENCES public.club_feed_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (feed_item_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.feed_likes TO authenticated;
GRANT ALL ON public.feed_likes TO service_role;
ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view likes" ON public.feed_likes;
CREATE POLICY "Members view likes" ON public.feed_likes FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.club_feed_items cfi JOIN public.group_memberships gm ON gm.group_id = cfi.club_id
    WHERE cfi.id = feed_likes.feed_item_id AND gm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Like own" ON public.feed_likes;
CREATE POLICY "Like own" ON public.feed_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Unlike own" ON public.feed_likes;
CREATE POLICY "Unlike own" ON public.feed_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.feed_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id UUID NOT NULL REFERENCES public.club_feed_items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feed_comments TO authenticated;
GRANT ALL ON public.feed_comments TO service_role;
ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view comments" ON public.feed_comments;
CREATE POLICY "Members view comments" ON public.feed_comments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.club_feed_items cfi JOIN public.group_memberships gm ON gm.group_id = cfi.club_id
    WHERE cfi.id = feed_comments.feed_item_id AND gm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Members post comments" ON public.feed_comments;
CREATE POLICY "Members post comments" ON public.feed_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.user_resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL,
  template TEXT NOT NULL DEFAULT 'modern', payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_resumes TO authenticated;
GRANT ALL ON public.user_resumes TO service_role;
ALTER TABLE public.user_resumes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage own resumes" ON public.user_resumes;
CREATE POLICY "Manage own resumes" ON public.user_resumes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.complete_verification(_check_in_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _user_id UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _habit_id UUID; _habit_title TEXT; _habit_category habit_category; _ci_status TEXT;
  _questions JSONB; _q JSONB; _i INT; _correct INT := 0; _total INT := 0; _passed BOOLEAN;
  _prev_current INT; _prev_longest INT; _prev_last DATE; _new_current INT; _new_longest INT;
  _milestone INT := NULL; _credits INT := 10; _bonus INT := 0; _xp INT := 25;
  _club_id UUID; _club_slug TEXT; _club_name TEXT; _display TEXT; _msg TEXT; _payload JSONB; _ach_id UUID;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT habit_id, status, verification->'questions' INTO _habit_id, _ci_status, _questions
    FROM public.check_ins WHERE id = _check_in_id AND user_id = _user_id;
  IF _habit_id IS NULL THEN RAISE EXCEPTION 'Check-in not found'; END IF;
  IF _ci_status = 'verified' THEN RAISE EXCEPTION 'Already verified'; END IF;

  SELECT title, category::habit_category INTO _habit_title, _habit_category FROM public.habits WHERE id = _habit_id;
  IF _habit_category IS NULL THEN _habit_category := 'custom'; END IF;

  _total := COALESCE(jsonb_array_length(_questions), 0);
  FOR _i IN 0 .. _total - 1 LOOP
    _q := _questions -> _i;
    IF (_q->>'correctIndex')::int = COALESCE((_answers ->> _i)::int, -1) THEN _correct := _correct + 1; END IF;
  END LOOP;
  _passed := _correct >= 3;

  IF NOT _passed THEN
    UPDATE public.check_ins SET status = 'rejected', score = _correct,
      verification = COALESCE(verification,'{}'::jsonb) || jsonb_build_object('answers', _answers, 'score', _correct)
      WHERE id = _check_in_id;
    INSERT INTO public.user_stats (user_id, verifications_failed) VALUES (_user_id, 1)
      ON CONFLICT (user_id) DO UPDATE SET verifications_failed = public.user_stats.verifications_failed + 1, updated_at = now();
    RETURN jsonb_build_object('status','rejected','score',_correct,'total',_total,'creditsAwarded',0,'habitTitle',_habit_title,'category',_habit_category);
  END IF;

  SELECT current_streak, longest_streak, last_check_in INTO _prev_current, _prev_longest, _prev_last
    FROM public.streaks WHERE user_id = _user_id AND habit_id = _habit_id;
  IF _prev_last = _today THEN _new_current := COALESCE(_prev_current, 1);
  ELSIF _prev_last = _today - INTERVAL '1 day' THEN _new_current := COALESCE(_prev_current, 0) + 1;
  ELSE _new_current := 1; END IF;
  _new_longest := GREATEST(_new_current, COALESCE(_prev_longest, 0));
  INSERT INTO public.streaks (user_id, habit_id, current_streak, longest_streak, last_check_in)
    VALUES (_user_id, _habit_id, _new_current, _new_longest, _today)
    ON CONFLICT (user_id, habit_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak, longest_streak = EXCLUDED.longest_streak, last_check_in = EXCLUDED.last_check_in;

  IF _correct = _total THEN _bonus := 5; _credits := _credits + 5;
    SELECT id INTO _ach_id FROM public.achievements WHERE slug = 'perfect_quiz';
    IF _ach_id IS NOT NULL THEN INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_user_id, _ach_id) ON CONFLICT DO NOTHING; END IF;
  END IF;

  IF _new_current IN (7,30,100,365) AND (_prev_current IS NULL OR _prev_current < _new_current) THEN
    _milestone := _new_current;
    _bonus := _bonus + CASE _new_current WHEN 7 THEN 50 WHEN 30 THEN 200 WHEN 100 THEN 500 WHEN 365 THEN 2000 END;
    _credits := _credits + CASE _new_current WHEN 7 THEN 50 WHEN 30 THEN 200 WHEN 100 THEN 500 WHEN 365 THEN 2000 END;
    _xp := _xp + 100;

    SELECT id, slug, name INTO _club_id, _club_slug, _club_name FROM public.groups
      WHERE category = _habit_category AND kind = 'club' LIMIT 1;
    IF _club_id IS NOT NULL AND _new_current >= 7 THEN
      INSERT INTO public.group_memberships (group_id, user_id) VALUES (_club_id, _user_id) ON CONFLICT DO NOTHING;
      SELECT COALESCE(display_name, username, 'Someone') INTO _display FROM public.profiles WHERE id = _user_id;
      _display := COALESCE(_display, 'Someone');
      _msg := '🔥 ' || _display || ' completed Day ' || _new_current || ' of their ' || _habit_title || ' streak!';
      _payload := jsonb_build_object('user_id', _user_id, 'habit_id', _habit_id, 'habit_title', _habit_title,
        'streak', _new_current, 'club_slug', _club_slug, 'category', _habit_category);
      INSERT INTO public.group_messages (group_id, author_id, kind, body, payload)
        VALUES (_club_id, NULL, 'system', _msg, _payload);
      INSERT INTO public.club_feed_items (club_id, user_id, kind, payload)
        VALUES (_club_id, _user_id, 'milestone', _payload || jsonb_build_object('message', _msg));
      INSERT INTO public.notifications (user_id, kind, payload)
        SELECT gm.user_id, 'milestone', _payload || jsonb_build_object('message', _msg)
        FROM public.group_memberships gm WHERE gm.group_id = _club_id;
    END IF;

    SELECT id INTO _ach_id FROM public.achievements WHERE slug = 'streak_' || _new_current;
    IF _ach_id IS NOT NULL THEN INSERT INTO public.user_achievements (user_id, achievement_id) VALUES (_user_id, _ach_id) ON CONFLICT DO NOTHING; END IF;
  END IF;

  UPDATE public.check_ins SET status = 'verified', score = _correct, verified_at = now(),
    verification = COALESCE(verification,'{}'::jsonb) || jsonb_build_object('answers', _answers, 'score', _correct, 'creditsAwarded', _credits)
    WHERE id = _check_in_id;

  INSERT INTO public.bond_credits_ledger (user_id, delta, reason, check_in_id, category)
    VALUES (_user_id, 10, 'verified_check_in', _check_in_id, _habit_category);
  IF _correct = _total THEN
    INSERT INTO public.bond_credits_ledger (user_id, delta, reason, check_in_id, category)
      VALUES (_user_id, 5, 'perfect_score', _check_in_id, _habit_category);
  END IF;
  IF _milestone IS NOT NULL THEN
    INSERT INTO public.bond_credits_ledger (user_id, delta, reason, check_in_id, category)
      VALUES (_user_id, CASE _milestone WHEN 7 THEN 50 WHEN 30 THEN 200 WHEN 100 THEN 500 WHEN 365 THEN 2000 END,
        'milestone_' || _milestone, _check_in_id, _habit_category);
  END IF;

  INSERT INTO public.user_category_credits (user_id, category, balance, lifetime)
    VALUES (_user_id, _habit_category, _credits, _credits)
    ON CONFLICT (user_id, category) DO UPDATE
    SET balance = public.user_category_credits.balance + _credits,
        lifetime = public.user_category_credits.lifetime + _credits, updated_at = now();

  INSERT INTO public.user_stats (user_id, total_credits, lifetime_credits, xp, verifications_passed)
    VALUES (_user_id, _credits, _credits, _xp, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      total_credits = public.user_stats.total_credits + _credits,
      lifetime_credits = public.user_stats.lifetime_credits + _credits,
      xp = public.user_stats.xp + _xp,
      verifications_passed = public.user_stats.verifications_passed + 1,
      updated_at = now();
  UPDATE public.user_stats SET level = CASE
    WHEN lifetime_credits >= 5000 THEN 7 WHEN lifetime_credits >= 2500 THEN 6
    WHEN lifetime_credits >= 1000 THEN 5 WHEN lifetime_credits >= 500 THEN 4
    WHEN lifetime_credits >= 250 THEN 3 WHEN lifetime_credits >= 100 THEN 2
    ELSE 1 END WHERE user_id = _user_id;

  RETURN jsonb_build_object('status','verified','score',_correct,'total',_total,'creditsAwarded',_credits,
    'newStreak',_new_current,'milestone',_milestone,'clubSlug',_club_slug,'clubName',_club_name,
    'message',_msg,'habitTitle',_habit_title,'category',_habit_category,'bonus',_bonus);
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_shield(_shield_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _user_id UUID := auth.uid(); _category habit_category; _cost INT; _validity INT; _balance INT; _us_id UUID;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT category, cost_credits, validity_days INTO _category, _cost, _validity FROM public.shields WHERE id = _shield_id;
  IF _cost IS NULL THEN RAISE EXCEPTION 'Shield not found'; END IF;
  SELECT balance INTO _balance FROM public.user_category_credits WHERE user_id = _user_id AND category = _category;
  IF COALESCE(_balance, 0) < _cost THEN RAISE EXCEPTION 'Insufficient % credits (need %, have %)', _category, _cost, COALESCE(_balance, 0); END IF;
  INSERT INTO public.user_shields (user_id, shield_id, category, expires_at)
    VALUES (_user_id, _shield_id, _category, now() + (_validity || ' days')::interval) RETURNING id INTO _us_id;
  INSERT INTO public.bond_credits_ledger (user_id, delta, reason, category)
    VALUES (_user_id, -_cost, 'shield_purchase', _category);
  UPDATE public.user_category_credits SET balance = balance - _cost, updated_at = now()
    WHERE user_id = _user_id AND category = _category;
  INSERT INTO public.user_achievements (user_id, achievement_id)
    SELECT _user_id, id FROM public.achievements WHERE slug = 'first_shield' ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('userShieldId', _us_id, 'remaining', _balance - _cost, 'category', _category);
END;
$$;

CREATE OR REPLACE FUNCTION public.use_shield(_user_shield_id uuid, _habit_id uuid, _missed_date date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _user_id UUID := auth.uid(); _status TEXT; _expires TIMESTAMPTZ; _prev_current INT;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT status, expires_at INTO _status, _expires FROM public.user_shields WHERE id = _user_shield_id AND user_id = _user_id;
  IF _status IS NULL THEN RAISE EXCEPTION 'Shield not found'; END IF;
  IF _status <> 'active' THEN RAISE EXCEPTION 'Shield not active'; END IF;
  IF _expires < now() THEN
    UPDATE public.user_shields SET status = 'expired' WHERE id = _user_shield_id;
    RAISE EXCEPTION 'Shield expired';
  END IF;
  SELECT current_streak INTO _prev_current FROM public.streaks WHERE user_id = _user_id AND habit_id = _habit_id;
  UPDATE public.streaks SET last_check_in = _missed_date WHERE user_id = _user_id AND habit_id = _habit_id;
  UPDATE public.user_shields SET status = 'used', used_at = now(), used_for_habit_id = _habit_id, used_for_date = _missed_date WHERE id = _user_shield_id;
  RETURN jsonb_build_object('protectedDate', _missed_date, 'currentStreak', _prev_current);
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_daily_box()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _user_id UUID := auth.uid(); _today DATE := (now() AT TIME ZONE 'utc')::date;
  _roll INT; _credits INT; _category habit_category; _reward JSONB;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.daily_reward_box WHERE user_id = _user_id AND claim_date = _today) THEN
    RAISE EXCEPTION 'Already claimed today';
  END IF;
  _roll := floor(random() * 100)::int;
  IF _roll < 60 THEN _credits := 5; ELSIF _roll < 90 THEN _credits := 15;
  ELSIF _roll < 99 THEN _credits := 50; ELSE _credits := 200; END IF;
  SELECT category INTO _category FROM public.user_category_credits WHERE user_id = _user_id ORDER BY lifetime DESC LIMIT 1;
  IF _category IS NULL THEN _category := 'coding'; END IF;
  _reward := jsonb_build_object('credits', _credits, 'category', _category);
  INSERT INTO public.daily_reward_box (user_id, claim_date, reward) VALUES (_user_id, _today, _reward);
  INSERT INTO public.bond_credits_ledger (user_id, delta, reason, category) VALUES (_user_id, _credits, 'daily_box', _category);
  INSERT INTO public.user_category_credits (user_id, category, balance, lifetime) VALUES (_user_id, _category, _credits, _credits)
    ON CONFLICT (user_id, category) DO UPDATE
    SET balance = public.user_category_credits.balance + _credits,
        lifetime = public.user_category_credits.lifetime + _credits, updated_at = now();
  RETURN _reward;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_shields() RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _n INT;
BEGIN UPDATE public.user_shields SET status = 'expired' WHERE status = 'active' AND expires_at < now();
  GET DIAGNOSTICS _n = ROW_COUNT; RETURN _n; END; $$;

CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id uuid, _payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _user_id UUID := auth.uid(); _cost INT; _balance INT; _redemption_id UUID;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT cost_credits INTO _cost FROM public.rewards WHERE id = _reward_id;
  IF _cost IS NULL THEN RAISE EXCEPTION 'Reward not found'; END IF;
  SELECT COALESCE(SUM(balance), 0) INTO _balance FROM public.user_category_credits WHERE user_id = _user_id;
  IF _balance < _cost THEN RAISE EXCEPTION 'Insufficient total credits (need %, have %)', _cost, _balance; END IF;
  INSERT INTO public.reward_redemptions (user_id, reward_id, payload) VALUES (_user_id, _reward_id, _payload) RETURNING id INTO _redemption_id;
  INSERT INTO public.bond_credits_ledger (user_id, delta, reason, category) VALUES (_user_id, -_cost, 'reward_redemption', NULL);
  UPDATE public.user_category_credits SET balance = GREATEST(0, balance - CEIL((balance::numeric / NULLIF(_balance, 0)) * _cost)::int), updated_at = now()
    WHERE user_id = _user_id;
  RETURN jsonb_build_object('redemptionId', _redemption_id, 'remainingCredits', _balance - _cost);
END;
$$;

-- Realtime: add tables only if not already in publication
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='club_feed_items') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.club_feed_items;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='message_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='group_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

INSERT INTO public.groups (slug, name, threshold, kind, category) VALUES
  ('club-coding','Coding Club',7,'club','coding'),('club-reading','Reading Club',7,'club','reading'),
  ('club-gym','Gym Club',7,'club','gym'),('club-running','Running Club',7,'club','running'),
  ('club-meditation','Meditation Club',7,'club','meditation'),('club-fasting','Fasting Club',7,'club','fasting')
ON CONFLICT (slug) DO UPDATE SET kind = 'club', category = EXCLUDED.category;

INSERT INTO public.shields (slug, kind, category, cost_credits, missed_days_protected, validity_days) VALUES
  ('bronze-coding','bronze','coding',100,1,7),('silver-coding','silver','coding',300,2,14),('gold-coding','gold','coding',700,5,30),
  ('bronze-reading','bronze','reading',100,1,7),('silver-reading','silver','reading',300,2,14),('gold-reading','gold','reading',700,5,30),
  ('bronze-gym','bronze','gym',100,1,7),('silver-gym','silver','gym',300,2,14),('gold-gym','gold','gym',700,5,30),
  ('bronze-running','bronze','running',100,1,7),('silver-running','silver','running',300,2,14),('gold-running','gold','running',700,5,30),
  ('bronze-meditation','bronze','meditation',100,1,7),('silver-meditation','silver','meditation',300,2,14),('gold-meditation','gold','meditation',700,5,30),
  ('bronze-fasting','bronze','fasting',100,1,7),('silver-fasting','silver','fasting',300,2,14),('gold-fasting','gold','fasting',700,5,30)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.achievements (slug, name, description, icon, tier, reward_credits, reward_xp) VALUES
  ('streak_7','Week Warrior','Reach a 7-day verified streak','flame','bronze',0,50),
  ('streak_30','Month Master','Reach a 30-day verified streak','flame','silver',0,200),
  ('streak_100','Centurion','Reach a 100-day verified streak','flame','gold',0,500),
  ('streak_365','Year of Iron','Reach a 365-day verified streak','crown','platinum',0,2000),
  ('first_shield','Shielded','Purchase your first shield','shield','bronze',0,25),
  ('first_verify','Verified','Pass your first AI verification','check-circle','bronze',0,25),
  ('perfect_quiz','Perfectionist','Score 5/5 on a verification quiz','star','silver',0,50),
  ('club_champion','Champion','Win Weekly Champion in a club','trophy','gold',0,200),
  ('five_categories','Renaissance','Build streaks in 5 categories','sparkles','gold',0,300),
  ('resume_builder','Job-Ready','Generate your first AI resume','file-text','silver',0,100),
  ('mission_master','Mission Master','Complete 10 daily missions','target','silver',0,150),
  ('social_butterfly','Social Butterfly','Like 25 club posts','heart','bronze',0,50)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.rewards (slug, name, description, cost_credits, kind) VALUES
  ('resume-builder','AI Resume Builder','Generate ATS-friendly resumes powered by AI',1000,'unlock'),
  ('linkedin-optimizer','LinkedIn Optimizer','AI-powered LinkedIn profile rewrite',1500,'unlock'),
  ('portfolio-generator','Portfolio Generator','Auto-build a developer portfolio site',2000,'unlock'),
  ('career-coach','AI Career Coach Session','30-min AI-guided career planning',2500,'unlock')
ON CONFLICT (slug) DO NOTHING;

UPDATE public.bond_credits_ledger l SET category = h.category::habit_category
  FROM public.check_ins ci JOIN public.habits h ON h.id = ci.habit_id
  WHERE l.check_in_id = ci.id AND l.category IS NULL;
