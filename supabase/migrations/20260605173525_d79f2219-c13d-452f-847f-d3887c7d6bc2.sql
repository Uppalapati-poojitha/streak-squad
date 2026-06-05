CREATE OR REPLACE FUNCTION public.perform_check_in(_habit_id uuid, _photo_url text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _habit RECORD;
  _prev_current INT;
  _prev_last DATE;
  _new_current INT;
  _new_longest INT;
  _prev_longest INT;
  _milestone INT := NULL;
  _group_id UUID;
  _group_slug TEXT;
  _group_name TEXT;
  _display TEXT;
  _msg TEXT;
  _payload JSONB;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _habit FROM public.habits WHERE id = _habit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Habit not found'; END IF;

  INSERT INTO public.check_ins (habit_id, user_id, check_in_date, photo_url)
  VALUES (_habit_id, _user_id, _today, _photo_url)
  ON CONFLICT (habit_id, user_id, check_in_date) DO NOTHING;

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

  IF _new_current IN (7, 30, 100, 365) AND (_prev_current IS NULL OR _prev_current < _new_current) THEN
    _milestone := _new_current;
    SELECT id, slug, name INTO _group_id, _group_slug, _group_name
      FROM public.groups WHERE threshold = _milestone LIMIT 1;

    IF _group_id IS NOT NULL THEN
      INSERT INTO public.group_memberships (group_id, user_id)
      VALUES (_group_id, _user_id) ON CONFLICT DO NOTHING;

      SELECT COALESCE(display_name, username, 'Someone') INTO _display FROM public.profiles WHERE id = _user_id;
      _display := COALESCE(_display, 'Someone');
      _msg := '🔥 ' || _display || ' completed Day ' || _new_current || ' of their ' || _habit.title || ' streak!';
      _payload := jsonb_build_object('user_id', _user_id, 'habit_id', _habit_id, 'habit_title', _habit.title, 'streak', _new_current, 'group_slug', _group_slug);

      INSERT INTO public.group_messages (group_id, author_id, kind, body, payload)
      VALUES (_group_id, NULL, 'system', _msg, _payload);

      INSERT INTO public.notifications (user_id, kind, payload)
      SELECT gm.user_id, 'milestone', _payload || jsonb_build_object('message', _msg)
      FROM public.group_memberships gm WHERE gm.group_id = _group_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'newStreak', _new_current,
    'milestone', _milestone,
    'groupSlug', _group_slug,
    'groupName', _group_name,
    'message', _msg,
    'habitTitle', _habit.title
  );
END;
$function$;