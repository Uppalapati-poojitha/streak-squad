-- Revoke EXECUTE from anon/public on all SECURITY DEFINER functions and grant
-- only to authenticated (and service_role for maintenance jobs). handle_new_user
-- runs as a trigger owner, so keep it locked down entirely.

REVOKE ALL ON FUNCTION public.complete_verification(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_verification(uuid, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.redeem_reward(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.expire_shields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_shields() TO service_role;

REVOKE ALL ON FUNCTION public.use_shield(uuid, uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_shield(uuid, uuid, date) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.seed_today_missions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seed_today_missions() TO service_role;

REVOKE ALL ON FUNCTION public.purchase_shield(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_shield(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.start_check_in(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_check_in(uuid, jsonb, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.claim_daily_box() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_daily_box() TO authenticated, service_role;