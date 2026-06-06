
DROP POLICY IF EXISTS "Users read own proof uploads" ON storage.objects;
CREATE POLICY "Users read own proof uploads" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'proof-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users write own proof uploads" ON storage.objects;
CREATE POLICY "Users write own proof uploads" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'proof-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete own proof uploads" ON storage.objects;
CREATE POLICY "Users delete own proof uploads" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'proof-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
