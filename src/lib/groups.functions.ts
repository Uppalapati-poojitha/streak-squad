import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id, joined_at")
      .eq("user_id", userId);

    const ids = (memberships ?? []).map((m) => m.group_id);
    const { data: groups } = await supabase.from("groups").select("*").order("threshold");

    const memberSet = new Set(ids);
    return (groups ?? []).map((g) => ({ ...g, joined: memberSet.has(g.id) }));
  });

export const getGroupBySlug = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: group, error } = await supabase
      .from("groups")
      .select("*")
      .eq("slug", data.slug)
      .single();
    if (error) throw new Error(error.message);

    const { data: messages } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", group.id)
      .order("created_at", { ascending: true })
      .limit(100);

    const { count: memberCount } = await supabase
      .from("group_memberships")
      .select("*", { count: "exact", head: true })
      .eq("group_id", group.id);

    return { group, messages: messages ?? [], memberCount: memberCount ?? 0 };
  });

export const postGroupMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ group_id: z.string().uuid(), body: z.string().min(1).max(500) }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("group_messages")
      .insert({ group_id: data.group_id, author_id: userId, kind: "user", body: data.body })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    return { ok: true };
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
    const { data: habits } = await supabase.from("habits").select("id").eq("owner_id", userId);
    const { data: streaks } = await supabase.from("streaks").select("*").eq("user_id", userId);
    const { count: groupCount } = await supabase
      .from("group_memberships")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const longest = (streaks ?? []).reduce((m, s) => Math.max(m, s.longest_streak), 0);
    return {
      profile,
      stats: {
        habits: habits?.length ?? 0,
        longestStreak: longest,
        groups: groupCount ?? 0,
      },
    };
  });
