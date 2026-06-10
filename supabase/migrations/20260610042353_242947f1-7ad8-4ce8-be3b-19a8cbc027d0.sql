CREATE TABLE public.global_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.global_messages TO authenticated;
GRANT ALL ON public.global_messages TO service_role;

ALTER TABLE public.global_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read global messages"
  ON public.global_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can post as themselves"
  ON public.global_messages FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON public.global_messages FOR DELETE TO authenticated
  USING (author_id = auth.uid());

CREATE INDEX idx_global_messages_created_at ON public.global_messages (created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.global_messages;
