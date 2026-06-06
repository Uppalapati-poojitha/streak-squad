import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getTodayMissions, claimMission } from "@/lib/missions.functions";
import { Target, Coins, Sparkles, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/missions")({ component: MissionsPage });

function MissionsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["missions"], queryFn: () => getTodayMissions() });
  const claim = useMutation({
    mutationFn: (mission_id: string) => claimMission({ data: { mission_id } }),
    onSuccess: (r) => {
      toast.success(`+${r.credits} credits • +${r.xp} XP`);
      qc.invalidateQueries({ queryKey: ["missions"] });
      qc.invalidateQueries({ queryKey: ["economy"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Claim failed"),
  });

  return (
    <AppShell title="Daily Missions">
      <div className="space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-fire/10 p-5">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <div>
              <h2 className="font-display text-xl font-bold">Today's missions</h2>
              <p className="text-xs text-muted-foreground">Reset every UTC day. Verify check-ins to make progress.</p>
            </div>
          </div>
        </div>

        {isLoading ? <p className="text-center text-sm text-muted-foreground">Loading…</p> : (data ?? []).map((m: any) => {
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
          return (
            <div key={m.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{m.title}</h3>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-mint">
                  <Coins className="h-3 w-3" />{m.reward_credits} <Sparkles className="ml-1 h-3 w-3 text-primary" />{m.reward_xp}xp
                </div>
              </div>
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-background">
                <div className="h-full bg-gradient-to-r from-primary to-mint" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{m.progress}/{m.target}</span>
                {m.claimed ? (
                  <span className="flex items-center gap-1 text-xs text-mint"><CheckCircle2 className="h-3 w-3" />Claimed</span>
                ) : m.completed ? (
                  <button onClick={() => claim.mutate(m.id)} className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-background">
                    Claim
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">In progress</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
