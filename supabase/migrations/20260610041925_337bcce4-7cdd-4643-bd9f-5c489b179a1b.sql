-- Deny direct client inserts/deletes on group_memberships; all joins go through SECURITY DEFINER RPCs
CREATE POLICY "Deny direct insert on group_memberships"
  ON public.group_memberships FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "Deny direct delete on group_memberships"
  ON public.group_memberships FOR DELETE TO authenticated
  USING (false);

-- Deny direct client inserts on notifications; all notifications created server-side
CREATE POLICY "Deny direct insert on notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (false);
