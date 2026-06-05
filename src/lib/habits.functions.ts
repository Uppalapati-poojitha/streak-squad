import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CATEGORIES = ["gym", "running", "coding", "reading", "meditation", "fasting", "custom"] as const;

export const listMyHabits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: habits, error } = await supabase
      .from("habits")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: streaks } = await supabase.from("streaks").select("*").eq("user_id", userId);
    const today = new Date().toISOString().slice(0, 10);
    const { data: todayCheckIns } = await supabase
      .from("check_ins")
      .select("habit_id")
      .eq("user_id", userId)
      .eq("check_in_date", today);

    const checkedToday = new Set((todayCheckIns ?? []).map((c) => c.habit_id));
    const streakMap = new Map((streaks ?? []).map((s) => [s.habit_id, s]));

    return (habits ?? []).map((h) => ({
      ...h,
      streak: streakMap.get(h.id)?.current_streak ?? 0,
      longest: streakMap.get(h.id)?.longest_streak ?? 0,
      checkedToday: checkedToday.has(h.id),
    }));
  });

export const createHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      title: z.string().min(1).max(80),
      category: z.enum(CATEGORIES),
      target_days: z.number().int().min(1).max(3650),
      is_public: z.boolean().default(false),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("habits")
      .insert({ ...data, owner_id: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const performCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ habit_id: z.string().uuid(), photo_url: z.string().optional().nullable() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("perform_check_in", {
      _habit_id: data.habit_id,
      _photo_url: data.photo_url ?? null,
    });
    if (error) throw new Error(error.message);
    return result as {
      newStreak: number;
      milestone: number | null;
      groupSlug: string | null;
      groupName: string | null;
      message: string | null;
      habitTitle: string;
    };
  });

export const listPublicChallenges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("habits")
      .select("id, title, category, target_days, created_at")
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return data ?? [];
  });
