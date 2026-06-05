import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, Lock, Check } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { listRewards, redeemReward, getMyEconomy } from "@/lib/economy.functions";

export const Route = createFileRoute("/_authenticated/rewards")({
  component: RewardsPage,
});

function RewardsPage() {
  const qc = useQueryClient();
  const { data: rewards = [] } = useQuery({ queryKey: ["rewards"], queryFn: () => listRewards() });
  const { data: econ } = useQuery({ queryKey: ["economy"], queryFn: () => getMyEconomy() });
  const balance = econ?.balance ?? 0;

  const mut = useMutation({
    mutationFn: (reward_id: string) => redeemReward({ data: { reward_id } }),
    onSuccess: (r) => {
      toast.success(`Redeemed! ${r.remainingCredits} credits left`);
      qc.invalidateQueries({ queryKey: ["rewards"] });
      qc.invalidateQueries({ queryKey: ["economy"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not redeem"),
  });

  return (
    <AppShell title="Rewards">
      <Flow>
        <FlowNode
          state="active"
          icon={<Gift className="h-5 w-5" />}
          title={`${balance} Bond Credits available`}
          subtitle="Earn more by verifying check-ins"
        />
        {rewards.map((r) => {
          const affordable = balance >= r.cost_credits;
          const state = r.owned ? "done" : affordable ? "fire" : "pending";
          return (
            <FlowNode
              key={r.id}
              state={state}
              icon={r.owned ? <Check className="h-5 w-5" /> : affordable ? <Gift className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              title={r.name}
              subtitle={`${r.description} · ${r.cost_credits} credits`}
              action={
                r.owned ? (
                  <span className="rounded-full bg-mint/15 px-3 py-1.5 text-xs font-semibold text-mint">Unlocked</span>
                ) : (
                  <button
                    onClick={() => mut.mutate(r.id)}
                    disabled={!affordable || mut.isPending}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40"
                  >
                    {affordable ? "Redeem" : `Need ${r.cost_credits - balance}`}
                  </button>
                )
              }
            />
          );
        })}
      </Flow>
    </AppShell>
  );
}
