
-- 1. Extend check_ins
ALTER TABLE public.check_ins
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS submission JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification JSONB,
  ADD COLUMN IF NOT EXISTS score INT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.check_ins DROP CONSTRAINT IF EXISTS check_ins_status_chk;
ALTER TABLE public.check_ins ADD CONSTRAINT check_ins_status_chk CHECK (status IN ('pending','verified','rejected'));

-- Backfill legacy rows as verified
UPDATE public.check_ins SET status = 'verified', verified_at = COALESCE(verified_at, created_at) WHERE status = 'pending' AND verification IS NULL;

-- 2. Bond credits ledger
CREATE TABLE IF NOT EXISTS public.bond_credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  delta INT NOT NULL,
  reason TEXT NOT NULL,
  check_in_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bond_credits_ledger TO authenticated;
GRANT ALL ON public.bond_credits_ledger TO service_role;
ALTER TABLE public.bond_credits_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own ledger" ON public.bond_credits_ledger;
CREATE POLICY "View own ledger" ON public.bond_credits_ledger FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON public.bond_credits_ledger(user_id, created_at DESC);

-- 3. User stats
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY,
  total_credits INT NOT NULL DEFAULT 0,
  lifetime_credits INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  verifications_passed INT NOT NULL DEFAULT 0,
  verifications_failed INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own stats" ON public.user_stats;
CREATE POLICY "View own stats" ON public.user_stats FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 4. Rewards
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  cost_credits INT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'unlock',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rewards TO authenticated, anon;
GRANT ALL ON public.rewards TO service_role;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Rewards are public" ON public.rewards;
CREATE POLICY "Rewards are public" ON public.rewards FOR SELECT USING (true);

INSERT INTO public.rewards (slug, name, description, cost_credits, kind) VALUES
  ('ai-resume-builder', 'AI Resume Builder', 'Generate an ATS-friendly professional resume with multiple templates and PDF export.', 1000, 'unlock'),
  ('streak-shield', 'Streak Shield', 'Protect your streak from one missed day.', 500, 'consumable'),
  ('profile-badge-gold', 'Gold Profile Badge', 'Show off your dedication with a gold badge on your profile.', 2000, 'cosmetic')
ON CONFLICT (slug) DO NOTHING;

-- 5. Redemptions
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.rewards(id),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB
);
GRANT SELECT ON public.reward_redemptions TO authenticated;
GRANT ALL ON public.reward_redemptions TO service_role;
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View own redemptions" ON public.reward_redemptions;
CREATE POLICY "View own redemptions" ON public.reward_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- 6. Drop old check-in RPC
DROP FUNCTION IF EXISTS public.perform_check_in(uuid, text);

-- 7. start_check_in
CREATE OR REPLACE FUNCTION public.start_check_in(_habit_id UUID, _submission JSONB, _questions JSONB)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _existing_id UUID;
  _existing_status TEXT;
  _id UUID;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT id, status INTO _existing_id, _existing_status FROM public.check_ins
    WHERE habit_id = _habit_id AND user_id = _user_id AND check_in_date = _today;

  IF _existing_id IS NOT NULL AND _existing_status = 'verified' THEN
    RAISE EXCEPTION 'Already verified for today';
  END IF;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.check_ins
      SET submission = _submission,
          verification = jsonb_build_object('questions', _questions),
          status = 'pending',
          score = NULL
      WHERE id = _existing_id
      RETURNING id INTO _id;
  ELSE
    INSERT INTO public.check_ins (habit_id, user_id, check_in_date, submission, verification, status)
    VALUES (_habit_id, _user_id, _today, _submission, jsonb_build_object('questions', _questions), 'pending')
    RETURNING id INTO _id;
  END IF;

  RETURN _id;
END;
$$;

-- 8. complete_verification
CREATE OR REPLACE FUNCTION public.complete_verification(_check_in_id UUID, _answers JSONB)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _habit_id UUID;
  _habit_title TEXT;
  _ci_status TEXT;
  _questions JSONB;
  _q JSONB;
  _i INT;
  _correct INT := 0;
  _total INT := 0;
  _passed BOOLEAN;
  _prev_current INT;
  _prev_longest INT;
  _prev_last DATE;
  _new_current INT;
  _new_longest INT;
  _milestone INT := NULL;
  _credits INT := 10;
  _bonus INT := 0;
  _xp INT := 25;
  _group_id UUID;
  _group_slug TEXT;
  _group_name TEXT;
  _display TEXT;
  _msg TEXT;
  _payload JSONB;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT habit_id, status, verification->'questions'
    INTO _habit_id, _ci_status, _questions
    FROM public.check_ins WHERE id = _check_in_id AND user_id = _user_id;

  IF _habit_id IS NULL THEN RAISE EXCEPTION 'Check-in not found'; END IF;
  IF _ci_status = 'verified' THEN RAISE EXCEPTION 'Already verified'; END IF;

  SELECT title INTO _habit_title FROM public.habits WHERE id = _habit_id;

  _total := COALESCE(jsonb_array_length(_questions), 0);

  FOR _i IN 0 .. _total - 1 LOOP
    _q := _questions -> _i;
    IF (_q->>'correctIndex')::int = COALESCE((_answers ->> _i)::int, -1) THEN
      _correct := _correct + 1;
    END IF;
  END LOOP;

  _passed := _correct >= 3;

  IF NOT _passed THEN
    UPDATE public.check_ins SET status = 'rejected', score = _correct,
      verification = COALESCE(verification,'{}'::jsonb) || jsonb_build_object('answers', _answers, 'score', _correct)
      WHERE id = _check_in_id;

    INSERT INTO public.user_stats (user_id, verifications_failed)
    VALUES (_user_id, 1)
    ON CONFLICT (user_id) DO UPDATE
      SET verifications_failed = public.user_stats.verifications_failed + 1, updated_at = now();

    RETURN jsonb_build_object('status','rejected','score',_correct,'total',_total,'creditsAwarded',0,'habitTitle',_habit_title);
  END IF;

  -- Streak update
  SELECT current_streak, longest_streak, last_check_in
    INTO _prev_current, _prev_longest, _prev_last
    FROM public.streaks WHERE user_id = _user_id AND habit_id = _habit_id;

  IF _prev_last = _today THEN
    _new_current := COALESCE(_prev_current, 1);
  ELSIF _prev_last = _today - INTERVAL '1 day' THEN
    _new_current := COALESCE(_prev_current, 0) + 1;
  ELSE
    _new_current := 1;
  END IF;

  _new_longest := GREATEST(_new_current, COALESCE(_prev_longest, 0));

  INSERT INTO public.streaks (user_id, habit_id, current_streak, longest_streak, last_check_in)
  VALUES (_user_id, _habit_id, _new_current, _new_longest, _today)
  ON CONFLICT (user_id, habit_id) DO UPDATE
    SET current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        last_check_in = EXCLUDED.last_check_in;

  -- Milestones
  IF _new_current IN (7,30,100,365) AND (_prev_current IS NULL OR _prev_current < _new_current) THEN
    _milestone := _new_current;
    _bonus := CASE _new_current WHEN 7 THEN 50 WHEN 30 THEN 200 WHEN 100 THEN 500 WHEN 365 THEN 2000 END;
    _credits := _credits + _bonus;
    _xp := _xp + 100;

    SELECT id, slug, name INTO _group_id, _group_slug, _group_name
      FROM public.groups WHERE threshold = _milestone LIMIT 1;
    IF _group_id IS NOT NULL THEN
      INSERT INTO public.group_memberships (group_id, user_id)
      VALUES (_group_id, _user_id) ON CONFLICT DO NOTHING;

      SELECT COALESCE(display_name, username, 'Someone') INTO _display FROM public.profiles WHERE id = _user_id;
      _display := COALESCE(_display, 'Someone');
      _msg := '🔥 ' || _display || ' completed Day ' || _new_current || ' of their ' || _habit_title || ' streak!';
      _payload := jsonb_build_object('user_id', _user_id, 'habit_id', _habit_id, 'habit_title', _habit_title, 'streak', _new_current, 'group_slug', _group_slug);

      INSERT INTO public.group_messages (group_id, author_id, kind, body, payload)
      VALUES (_group_id, NULL, 'system', _msg, _payload);

      INSERT INTO public.notifications (user_id, kind, payload)
      SELECT gm.user_id, 'milestone', _payload || jsonb_build_object('message', _msg)
      FROM public.group_memberships gm WHERE gm.group_id = _group_id;
    END IF;
  END IF;

  -- Mark verified
  UPDATE public.check_ins SET status = 'verified', score = _correct, verified_at = now(),
    verification = COALESCE(verification,'{}'::jsonb) || jsonb_build_object('answers', _answers, 'score', _correct, 'creditsAwarded', _credits)
    WHERE id = _check_in_id;

  -- Ledger
  INSERT INTO public.bond_credits_ledger (user_id, delta, reason, check_in_id)
  VALUES (_user_id, 10, 'verified_check_in', _check_in_id);
  IF _bonus > 0 THEN
    INSERT INTO public.bond_credits_ledger (user_id, delta, reason, check_in_id)
    VALUES (_user_id, _bonus, 'milestone_' || _milestone, _check_in_id);
  END IF;

  -- Stats
  INSERT INTO public.user_stats (user_id, total_credits, lifetime_credits, xp, verifications_passed)
  VALUES (_user_id, _credits, _credits, _xp, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_credits = public.user_stats.total_credits + _credits,
    lifetime_credits = public.user_stats.lifetime_credits + _credits,
    xp = public.user_stats.xp + _xp,
    verifications_passed = public.user_stats.verifications_passed + 1,
    updated_at = now();

  UPDATE public.user_stats SET level = CASE
    WHEN lifetime_credits >= 1000 THEN 5
    WHEN lifetime_credits >= 500 THEN 4
    WHEN lifetime_credits >= 250 THEN 3
    WHEN lifetime_credits >= 100 THEN 2
    ELSE 1 END
    WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'status','verified',
    'score',_correct,
    'total',_total,
    'creditsAwarded',_credits,
    'newStreak',_new_current,
    'milestone',_milestone,
    'groupSlug',_group_slug,
    'groupName',_group_name,
    'message',_msg,
    'habitTitle',_habit_title
  );
END;
$$;

-- 9. redeem_reward
CREATE OR REPLACE FUNCTION public.redeem_reward(_reward_id UUID, _payload JSONB DEFAULT '{}'::jsonb)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _cost INT;
  _balance INT;
  _redemption_id UUID;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT cost_credits INTO _cost FROM public.rewards WHERE id = _reward_id;
  IF _cost IS NULL THEN RAISE EXCEPTION 'Reward not found'; END IF;

  SELECT total_credits INTO _balance FROM public.user_stats WHERE user_id = _user_id;
  IF COALESCE(_balance, 0) < _cost THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  INSERT INTO public.reward_redemptions (user_id, reward_id, payload)
  VALUES (_user_id, _reward_id, _payload) RETURNING id INTO _redemption_id;

  INSERT INTO public.bond_credits_ledger (user_id, delta, reason)
  VALUES (_user_id, -_cost, 'reward_redemption');

  UPDATE public.user_stats SET total_credits = total_credits - _cost, updated_at = now()
    WHERE user_id = _user_id;

  RETURN jsonb_build_object('redemptionId', _redemption_id, 'remainingCredits', _balance - _cost);
END;
$$;
