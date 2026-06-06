import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listShields = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Mark expired before returning inventory
    await supabase.rpc("expire_shields");
    const [{ data: catalog }, { data: inventory }] = await Promise.all([
      supabase.from("shields").select("*").order("cost_credits"),
      supabase.from("user_shields").select("*, shield:shields(*)").eq("user_id", userId).order("purchased_at", { ascending: false }),
    ]);
    return { catalog: catalog ?? [], inventory: inventory ?? [] };
  });

export const purchaseShield = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ shield_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("purchase_shield", { _shield_id: data.shield_id });
    if (error) throw new Error(error.message);
    return result as { userShieldId: string; remaining: number; category: string };
  });

export const useShield = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      user_shield_id: z.string().uuid(),
      habit_id: z.string().uuid(),
      missed_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("use_shield", {
      _user_shield_id: data.user_shield_id,
      _habit_id: data.habit_id,
      _missed_date: data.missed_date,
    });
    if (error) throw new Error(error.message);
    return result as { protectedDate: string; currentStreak: number };
  });
