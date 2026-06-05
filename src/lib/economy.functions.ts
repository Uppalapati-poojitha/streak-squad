import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000];

export const getMyEconomy = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: stats } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { data: ledger } = await supabase
      .from("bond_credits_ledger")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    const earnedToday = (ledger ?? [])
      .filter((l) => new Date(l.created_at) >= todayStart && l.delta > 0)
      .reduce((sum, l) => sum + l.delta, 0);

    const { count: pendingCount } = await supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "pending");

    const lifetime = stats?.lifetime_credits ?? 0;
    const level = stats?.level ?? 1;
    const nextThreshold = LEVEL_THRESHOLDS[level] ?? lifetime + 1000;
    const prevThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
    const xpProgress = Math.min(100, Math.round(((lifetime - prevThreshold) / Math.max(1, nextThreshold - prevThreshold)) * 100));

    const totalChecks = (stats?.verifications_passed ?? 0) + (stats?.verifications_failed ?? 0);
    const successRate = totalChecks > 0
      ? Math.round(((stats?.verifications_passed ?? 0) / totalChecks) * 100)
      : 100;

    return {
      balance: stats?.total_credits ?? 0,
      lifetime,
      level,
      xp: stats?.xp ?? 0,
      nextThreshold,
      xpProgress,
      earnedToday,
      pendingCount: pendingCount ?? 0,
      successRate,
      verificationsPassed: stats?.verifications_passed ?? 0,
      verificationsFailed: stats?.verifications_failed ?? 0,
      ledger: (ledger ?? []).slice(0, 20),
    };
  });

export const listRewards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rewards } = await supabase
      .from("rewards")
      .select("*")
      .order("cost_credits", { ascending: true });
    const { data: redemptions } = await supabase
      .from("reward_redemptions")
      .select("reward_id")
      .eq("user_id", userId);
    const owned = new Set((redemptions ?? []).map((r) => r.reward_id));
    return (rewards ?? []).map((r) => ({ ...r, owned: owned.has(r.id) }));
  });

export const redeemReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ reward_id: z.string().uuid(), payload: z.record(z.string(), z.any()).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("redeem_reward", {
      _reward_id: data.reward_id,
      _payload: (data.payload ?? {}) as any,
    });
    if (error) throw new Error(error.message);
    return result as { redemptionId: string; remainingCredits: number };
  });
