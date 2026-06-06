import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDailyBoxStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("daily_reward_box")
      .select("*")
      .eq("user_id", userId)
      .eq("claim_date", today)
      .maybeSingle();
    return { claimed: !!data, reward: data?.reward ?? null };
  });

export const claimDailyBox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("claim_daily_box");
    if (error) throw new Error(error.message);
    return data as { credits: number; category: string };
  });
