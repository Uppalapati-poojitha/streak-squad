
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "Members view memberships of their groups" ON public.group_memberships;

CREATE POLICY "Members view memberships of their groups"
ON public.group_memberships
FOR SELECT
USING (public.is_group_member(group_id, auth.uid()));
