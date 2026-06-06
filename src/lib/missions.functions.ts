import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SEED_MISSIONS = [
  { kind: "verify_one", title: "Verify 1 check-in", description: "Complete any AI-verified check-in today", target: 1, reward_credits: 15, reward_xp: 30 },
  { kind: "perfect_score", title: "Score 5/5", description: "Get a perfect score on a verification quiz", target: 1, reward_credits: 25, reward_xp: 50 },
  { kind: "verify_two_categories", title: "Two categories", description: "Verify check-ins in 2 different categories", target: 2, reward_credits: 30, reward_xp: 60 },
];

async function ensureTodayMissions(supabase: any) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase.from("daily_missions").select("id").eq("mission_date", today);
  if ((existing ?? []).length >= SEED_MISSIONS.length) return;
  for (const m of SEED_MISSIONS) {
    await supabase.from("daily_missions").insert({ ...m, mission_date: today });
  }
}

export const getTodayMissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await ensureTodayMissions(supabase as any);
    const today = new Date().toISOString().slice(0, 10);
    const { data: missions } = await supabase.from("daily_missions").select("*").eq("mission_date", today);
    const ids = (missions ?? []).map((m) => m.id);
    const { data: progress } = await supabase.from("user_mission_progress").select("*").eq("user_id", userId).in("mission_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const progressMap = new Map((progress ?? []).map((p) => [p.mission_id, p]));

    // Compute live progress from today's verified check-ins
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: ci } = await supabase
      .from("check_ins")
      .select("status, score, verification, habit:habits(category)")
      .eq("user_id", userId)
      .gte("verified_at", todayStart.toISOString());
    const verified = (ci ?? []).filter((r: any) => r.status === "verified");
    const cats = new Set(verified.map((r: any) => r.habit?.category).filter(Boolean));
    const perfects = verified.filter((r: any) => r.score === 5).length;

    return (missions ?? []).map((m) => {
      let live = 0;
      if (m.kind === "verify_one") live = verified.length;
      else if (m.kind === "perfect_score") live = perfects;
      else if (m.kind === "verify_two_categories") live = cats.size;
      const p = progressMap.get(m.id);
      return {
        ...m,
        progress: Math.min(m.target, live),
        completed: live >= m.target,
        claimed: !!p?.claimed_at,
      };
    });
  });

export const claimMission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ mission_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: mission } = await supabase.from("daily_missions").select("*").eq("id", data.mission_id).maybeSingle();
    if (!mission) throw new Error("Mission not found");

    // Re-check completion server-side
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: ci } = await supabase
      .from("check_ins")
      .select("status, score, verification, habit:habits(category)")
      .eq("user_id", userId)
      .gte("verified_at", todayStart.toISOString());
    const verified = (ci ?? []).filter((r: any) => r.status === "verified");
    let live = 0;
    if (mission.kind === "verify_one") live = verified.length;
    else if (mission.kind === "perfect_score") live = verified.filter((r: any) => r.score === 5).length;
    else if (mission.kind === "verify_two_categories") {
      const cats = new Set(verified.map((r: any) => r.habit?.category).filter(Boolean));
      live = cats.size;
    }
    if (live < mission.target) throw new Error("Mission not complete yet");

    const { data: existing } = await supabase
      .from("user_mission_progress")
      .select("*")
      .eq("user_id", userId)
      .eq("mission_id", mission.id)
      .maybeSingle();
    if (existing?.claimed_at) throw new Error("Already claimed");

    if (existing) {
      await supabase.from("user_mission_progress").update({ progress: live, completed_at: new Date().toISOString(), claimed_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("user_mission_progress").insert({
        user_id: userId, mission_id: mission.id, progress: live,
        completed_at: new Date().toISOString(), claimed_at: new Date().toISOString(),
      });
    }

    // Award credits to category (or fall back to coding) + global stats
    const category = (mission.category ?? "coding") as any;
    await supabase.from("bond_credits_ledger").insert({
      user_id: userId, delta: mission.reward_credits, reason: "mission_" + mission.kind, category,
    });
    const { data: cur } = await supabase.from("user_category_credits").select("balance, lifetime").eq("user_id", userId).eq("category", category).maybeSingle();
    if (cur) {
      await supabase.from("user_category_credits").update({
        balance: cur.balance + mission.reward_credits,
        lifetime: cur.lifetime + mission.reward_credits,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("category", category);
    } else {
      await supabase.from("user_category_credits").insert({
        user_id: userId, category, balance: mission.reward_credits, lifetime: mission.reward_credits,
      });
    }
    const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle();
    if (stats) {
      await supabase.from("user_stats").update({
        total_credits: stats.total_credits + mission.reward_credits,
        lifetime_credits: stats.lifetime_credits + mission.reward_credits,
        xp: stats.xp + mission.reward_xp,
        updated_at: new Date().toISOString(),
      }).eq("user_id", userId);
    } else {
      await supabase.from("user_stats").insert({
        user_id: userId, total_credits: mission.reward_credits, lifetime_credits: mission.reward_credits, xp: mission.reward_xp,
      });
    }

    return { credits: mission.reward_credits, xp: mission.reward_xp };
  });
