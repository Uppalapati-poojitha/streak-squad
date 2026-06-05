import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Coins, TrendingUp, ShieldCheck, Clock, Trophy } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { getMyEconomy } from "@/lib/economy.functions";

export const Route = createFileRoute("/_authenticated/economy")({
  component: EconomyPage,
});

function EconomyPage() {
  const { data, isLoading } = useQuery({ queryKey: ["economy"], queryFn: () => getMyEconomy() });

  if (isLoading || !data) {
    return <AppShell title="Economy"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

  return (
    <AppShell title="Bond Credits">
      <Flow>
        <FlowNode
          state="active"
          icon={<Coins className="h-5 w-5" />}
          title={<span className="text-2xl font-bold tabular-nums">{data.balance}</span>}
          subtitle={`Lifetime earned: ${data.lifetime} · Level ${data.level}`}
        />
        <FlowNode
          state="done"
          icon={<TrendingUp className="h-5 w-5" />}
          title={`+${data.earnedToday} today`}
          subtitle="Credits earned in the last 24h"
        />
        <FlowNode
          state="done"
          icon={<ShieldCheck className="h-5 w-5" />}
          title={`${data.successRate}% verification success`}
          subtitle={`${data.verificationsPassed} passed · ${data.verificationsFailed} rejected`}
        />
        {data.pendingCount > 0 && (
          <FlowNode
            state="fire"
            icon={<Clock className="h-5 w-5" />}
            title={`${data.pendingCount} pending verification${data.pendingCount > 1 ? "s" : ""}`}
            subtitle="Finish them to earn credits"
          />
        )}
        <FlowNode
          state="active"
          icon={<Trophy className="h-5 w-5" />}
          title={`Level ${data.level} · ${data.lifetime}/${data.nextThreshold} XP`}
          subtitle={`${data.xpProgress}% to next level`}
        >
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-background">
            <div className="h-full bg-gradient-to-r from-primary to-mint" style={{ width: `${data.xpProgress}%` }} />
          </div>
        </FlowNode>

        {data.ledger.length === 0 ? (
          <FlowNode
            state="pending"
            icon={<Coins className="h-5 w-5" />}
            title="No credit history yet"
            subtitle="Verify a check-in to earn your first credits"
          />
        ) : (
          <FlowNode state="done" icon={<Coins className="h-5 w-5" />} title="Recent activity" subtitle={`Last ${data.ledger.length} entries`}>
            <ul className="mt-3 space-y-2">
              {data.ledger.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2 text-xs">
                  <div>
                    <div className="font-medium capitalize">{l.reason.replace(/_/g, " ")}</div>
                    <div className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
                  </div>
                  <span className={`font-bold tabular-nums ${l.delta > 0 ? "text-mint" : "text-fire"}`}>
                    {l.delta > 0 ? "+" : ""}{l.delta}
                  </span>
                </li>
              ))}
            </ul>
          </FlowNode>
        )}
      </Flow>
    </AppShell>
  );
}
