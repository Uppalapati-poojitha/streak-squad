
-- 1) Tighten feed_comments INSERT to require club membership
DROP POLICY IF EXISTS "Members post comments" ON public.feed_comments;
CREATE POLICY "Members post comments"
ON public.feed_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.club_feed_items cfi
    JOIN public.group_memberships gm ON gm.group_id = cfi.club_id
    WHERE cfi.id = feed_comments.feed_item_id AND gm.user_id = auth.uid()
  )
);

-- 2) Tighten feed_likes INSERT to require club membership
DROP POLICY IF EXISTS "Like own" ON public.feed_likes;
CREATE POLICY "Members like feed items"
ON public.feed_likes FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.club_feed_items cfi
    JOIN public.group_memberships gm ON gm.group_id = cfi.club_id
    WHERE cfi.id = feed_likes.feed_item_id AND gm.user_id = auth.uid()
  )
);

-- 3) Storage: add UPDATE policy on proof-uploads (user folder scoped)
DROP POLICY IF EXISTS "Users update own proof uploads" ON storage.objects;
CREATE POLICY "Users update own proof uploads"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'proof-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'proof-uploads'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 4) Revoke EXECUTE from anon/public on SECURITY DEFINER functions.
--    These all check auth.uid() internally and are intended for signed-in users only.
REVOKE EXECUTE ON FUNCTION public.complete_verification(uuid, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.start_check_in(uuid, jsonb, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.redeem_reward(uuid, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.purchase_shield(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.use_shield(uuid, uuid, date) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_daily_box() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.seed_today_missions() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.expire_shields() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.complete_verification(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_check_in(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_reward(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_shield(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.use_shield(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_box() TO authenticated;
GRANT EXECUTE ON FUNCTION public.seed_today_missions() TO authenticated;
