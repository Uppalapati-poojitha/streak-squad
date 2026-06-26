-- Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles viewable by all" ON public.profiles;
DROP POLICY IF EXISTS "Profiles select" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

REVOKE SELECT ON public.profiles FROM anon;

-- Lock down streaks: only server-side SECURITY DEFINER functions may insert/update
CREATE POLICY "No direct inserts on streaks"
  ON public.streaks
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "No direct updates on streaks"
  ON public.streaks
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);