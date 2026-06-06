CREATE OR REPLACE FUNCTION public.seed_today_missions()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _today DATE := (now() AT TIME ZONE 'utc')::date;
BEGIN
  IF EXISTS (SELECT 1 FROM public.daily_missions WHERE mission_date = _today) THEN RETURN; END IF;
  INSERT INTO public.daily_missions (mission_date, kind, title, description, target, reward_credits, reward_xp) VALUES
    (_today, 'verify_one', 'Verify 1 check-in', 'Complete any AI-verified check-in today', 1, 15, 30),
    (_today, 'perfect_score', 'Score 5/5', 'Get a perfect score on a verification quiz', 1, 25, 50),
    (_today, 'verify_two_categories', 'Two categories', 'Verify check-ins in 2 different categories', 2, 30, 60);
END; $$;