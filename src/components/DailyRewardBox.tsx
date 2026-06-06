import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Gift, Sparkles, Coins } from "lucide-react";
import { toast } from "sonner";
import { getDailyBoxStatus, claimDailyBox } from "@/lib/dailybox.functions";

export function DailyRewardBox() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["dailybox"], queryFn: () => getDailyBoxStatus() });
  const claim = useMutation({
    mutationFn: () => claimDailyBox(),
    onSuccess: (r) => {
      toast.success(`+${r.credits} ${r.category} credits! 🎉`);
      qc.invalidateQueries({ queryKey: ["dailybox"] });
      qc.invalidateQueries({ queryKey: ["economy"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Claim failed"),
  });

  if (data?.claimed) {
    return (
      <div className="rounded-2xl border border-mint/30 bg-mint/5 p-3 text-center text-xs text-muted-foreground">
        ✓ Daily box claimed · +{(data.reward as any)?.credits ?? 0} {(data.reward as any)?.category ?? ""} credits
      </div>
    );
  }
  return (
    <motion.button
      onClick={() => claim.mutate()}
      disabled={claim.isPending}
      whileTap={{ scale: 0.97 }}
      className="flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-amber-400 via-rose-400 to-violet-500 p-4 text-background shadow-lg disabled:opacity-50"
    >
      <div className="flex items-center gap-3">
        <motion.div animate={{ rotate: [0, -10, 10, -10, 0] }} transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}>
          <Gift className="h-7 w-7" />
        </motion.div>
        <div className="text-left">
          <p className="text-sm font-bold">Open today's reward box</p>
          <p className="text-[10px] opacity-90">Random Bond Credits await</p>
        </div>
      </div>
      <Sparkles className="h-5 w-5" />
    </motion.button>
  );
}
