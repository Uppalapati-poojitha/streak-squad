import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listMyClubs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships } = await supabase
      .from("group_memberships")
      .select("group_id, joined_at, group:groups(id, slug, name, category, kind)")
      .eq("user_id", userId);
    return (memberships ?? []).map((m: any) => m.group).filter(Boolean);
  });

export const getClub = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ slug: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: club } = await supabase.from("groups").select("*").eq("slug", data.slug).maybeSingle();
    if (!club) throw new Error("Club not found");

    const { data: membership } = await supabase
      .from("group_memberships")
      .select("user_id")
      .eq("group_id", club.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership) throw new Error("Not a member of this club");

    const [{ data: messages }, { data: members }, { data: feed }, { data: champions }] = await Promise.all([
      supabase.from("group_messages").select("*").eq("group_id", club.id).order("created_at", { ascending: true }).limit(100),
      supabase.from("group_memberships").select("user_id, joined_at, profile:profiles!group_memberships_user_id_fkey(id, display_name, username, avatar_url)").eq("group_id", club.id),
      supabase.from("club_feed_items").select("*").eq("club_id", club.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("weekly_champions").select("*").eq("club_id", club.id).order("week_start", { ascending: false }).limit(10),
    ]);

    // Leaderboard: top 10 members by category streak
    const memberIds = (members ?? []).map((m: any) => m.user_id);
    let leaderboard: Array<{ user_id: string; display_name: string; current_streak: number; longest_streak: number; lifetime: number }> = [];
    if (memberIds.length > 0 && club.category) {
      const { data: lbRows } = await supabase
        .from("streaks")
        .select("user_id, current_streak, longest_streak, habit:habits!inner(category)")
        .in("user_id", memberIds)
        .eq("habit.category", club.category);
      const { data: credits } = await supabase
        .from("user_category_credits")
        .select("user_id, lifetime")
        .in("user_id", memberIds)
        .eq("category", club.category);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", memberIds);
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const creditMap = new Map((credits ?? []).map((c: any) => [c.user_id, c.lifetime]));
      const streakMap = new Map<string, { current: number; longest: number }>();
      for (const row of lbRows ?? []) {
        const prev = streakMap.get((row as any).user_id) ?? { current: 0, longest: 0 };
        streakMap.set((row as any).user_id, {
          current: Math.max(prev.current, (row as any).current_streak),
          longest: Math.max(prev.longest, (row as any).longest_streak),
        });
      }
      leaderboard = memberIds
        .map((id) => {
          const p: any = profMap.get(id);
          const s = streakMap.get(id) ?? { current: 0, longest: 0 };
          return {
            user_id: id,
            display_name: p?.display_name ?? p?.username ?? "Member",
            current_streak: s.current,
            longest_streak: s.longest,
            lifetime: creditMap.get(id) ?? 0,
          };
        })
        .sort((a, b) => b.current_streak - a.current_streak || b.lifetime - a.lifetime)
        .slice(0, 10);
    }

    return {
      club,
      messages: messages ?? [],
      members: members ?? [],
      feed: feed ?? [],
      champions: champions ?? [],
      leaderboard,
    };
  });

export const postClubMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      group_id: z.string().uuid(),
      body: z.string().min(1).max(500),
      reply_to_id: z.string().uuid().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: msg, error } = await supabase
      .from("group_messages")
      .insert({
        group_id: data.group_id,
        author_id: userId,
        kind: "user",
        body: data.body,
        reply_to_id: data.reply_to_id ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return msg;
  });

export const toggleFeedLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ feed_item_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("feed_likes")
      .select("user_id")
      .eq("feed_item_id", data.feed_item_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      await supabase.from("feed_likes").delete().eq("feed_item_id", data.feed_item_id).eq("user_id", userId);
      return { liked: false };
    }
    await supabase.from("feed_likes").insert({ feed_item_id: data.feed_item_id, user_id: userId });
    return { liked: true };
  });

export const computeWeeklyChampions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Lazy-compute on-demand for current week if not already stored
    const { supabase } = context;
    const now = new Date();
    const day = now.getUTCDay();
    const diff = (day + 6) % 7; // Monday = 0
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - diff);
    monday.setUTCHours(0, 0, 0, 0);
    const weekStart = monday.toISOString().slice(0, 10);

    const { data: clubs } = await supabase.from("groups").select("id, category").eq("kind", "club");
    for (const club of clubs ?? []) {
      const { data: exists } = await supabase
        .from("weekly_champions")
        .select("id")
        .eq("club_id", club.id)
        .eq("week_start", weekStart)
        .eq("metric", "current_streak")
        .maybeSingle();
      if (exists) continue;

      const { data: members } = await supabase
        .from("group_memberships")
        .select("user_id")
        .eq("group_id", club.id);
      const memberIds = (members ?? []).map((m: any) => m.user_id);
      if (memberIds.length === 0) continue;

      const { data: streaks } = await supabase
        .from("streaks")
        .select("user_id, current_streak, habit:habits!inner(category)")
        .in("user_id", memberIds)
        .eq("habit.category", club.category!);

      const best = new Map<string, number>();
      for (const s of streaks ?? []) {
        const prev = best.get((s as any).user_id) ?? 0;
        if ((s as any).current_streak > prev) best.set((s as any).user_id, (s as any).current_streak);
      }
      let topUser: string | null = null;
      let topVal = 0;
      for (const [uid, v] of best) if (v > topVal) { topUser = uid; topVal = v; }
      if (topUser && topVal > 0) {
        await supabase.from("weekly_champions").insert({
          club_id: club.id, user_id: topUser, week_start: weekStart, metric: "current_streak", value: topVal,
        });
      }
    }
    return { weekStart };
  });
