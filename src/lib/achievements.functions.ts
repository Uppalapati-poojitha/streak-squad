import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listAchievements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: catalog }, { data: unlocks }, { data: streaks }] = await Promise.all([
      supabase.from("achievements").select("*").order("tier"),
      supabase.from("user_achievements").select("achievement_id, unlocked_at").eq("user_id", userId),
      supabase.from("streaks").select("current_streak, longest_streak").eq("user_id", userId),
    ]);
    const unlockMap = new Map((unlocks ?? []).map((u) => [u.achievement_id, u.unlocked_at]));
    const bestStreak = (streaks ?? []).reduce((m, s) => Math.max(m, s.longest_streak ?? 0), 0);

    return {
      bestStreak,
      items: (catalog ?? []).map((a) => {
        const unlocked_at = unlockMap.get(a.id) ?? null;
        // Derive progress for streak_X achievements from longest streak
        const streakMatch = a.slug?.match(/^streak_(\d+)$/);
        let target: number | null = null;
        let progress: number | null = null;
        if (streakMatch) {
          target = Number(streakMatch[1]);
          progress = Math.min(bestStreak, target);
        }
        return { ...a, unlocked_at, target, progress };
      }),
    };
  });

export const getHeatmap = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 365);
    const { data } = await supabase
      .from("check_ins")
      .select("check_in_date, status")
      .eq("user_id", userId)
      .eq("status", "verified")
      .gte("check_in_date", since.toISOString().slice(0, 10));
    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.check_in_date] = (counts[row.check_in_date] ?? 0) + 1;
    }
    return counts;
  });
