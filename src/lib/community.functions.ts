import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listGlobalMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: messages, error } = await supabase
      .from("global_messages")
      .select("id, author_id, body, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const rows = (messages ?? []).slice().reverse();
    const authorIds = Array.from(new Set(rows.map((m) => m.author_id)));
    if (authorIds.length === 0) return { messages: rows, authors: {} as Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> };

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", authorIds);

    const authors: Record<string, { display_name: string | null; username: string | null; avatar_url: string | null }> = {};
    for (const p of profiles ?? []) authors[p.id] = { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url };
    return { messages: rows, authors };
  });

export const postGlobalMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ body: z.string().min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("global_messages")
      .insert({ author_id: userId, body: data.body })
      .select("id, author_id, body, created_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteGlobalMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("global_messages")
      .delete()
      .eq("id", data.id)
      .eq("author_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
