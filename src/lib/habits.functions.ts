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
      .select("habit_id, status")
      .eq("user_id", userId)
      .eq("check_in_date", today);

    const verifiedToday = new Set(
      (todayCheckIns ?? []).filter((c) => c.status === "verified").map((c) => c.habit_id),
    );
    const pendingToday = new Set(
      (todayCheckIns ?? []).filter((c) => c.status === "pending").map((c) => c.habit_id),
    );
    const streakMap = new Map((streaks ?? []).map((s) => [s.habit_id, s]));

    return (habits ?? []).map((h) => ({
      ...h,
      streak: streakMap.get(h.id)?.current_streak ?? 0,
      longest: streakMap.get(h.id)?.longest_streak ?? 0,
      verifiedToday: verifiedToday.has(h.id),
      pendingToday: pendingToday.has(h.id),
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

export const deleteHabit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: habit, error: fetchErr } = await supabase
      .from("habits")
      .select("id, owner_id")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!habit || habit.owner_id !== userId) throw new Error("Habit not found");

    await supabase.from("check_ins").delete().eq("habit_id", data.id).eq("user_id", userId);
    await supabase.from("streaks").delete().eq("habit_id", data.id).eq("user_id", userId);

    const { error: delErr } = await supabase
      .from("habits")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true, id: data.id };
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
