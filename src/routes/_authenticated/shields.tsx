import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listShields, purchaseShield } from "@/lib/shields.functions";
import { getMyEconomy } from "@/lib/economy.functions";
import { Shield, Coins, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORIES = ["coding", "reading", "gym", "running", "meditation", "fasting"] as const;
const TIER_COLORS: Record<string, string> = {
  bronze: "from-orange-700 to-orange-500",
  silver: "from-slate-400 to-slate-200",
  gold: "from-amber-400 to-yellow-200",
};

export const Route = createFileRoute("/_authenticated/shields")({ component: ShieldsPage });

function ShieldsPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>("coding");
  const { data, isLoading } = useQuery({ queryKey: ["shields"], queryFn: () => listShields() });
  const { data: econ } = useQuery({ queryKey: ["economy"], queryFn: () => getMyEconomy() });
  const buyMut = useMutation({
    mutationFn: (shield_id: string) => purchaseShield({ data: { shield_id } }),
    onSuccess: () => {
      toast.success("Shield activated!");
      qc.invalidateQueries({ queryKey: ["shields"] });
      qc.invalidateQueries({ queryKey: ["economy"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Purchase failed"),
  });

  const balance = econ?.byCategory?.[category]?.balance ?? 0;
  const catalogForCat = (data?.catalog ?? []).filter((s: any) => s.category === category);
  const inventoryActive = (data?.inventory ?? []).filter((s: any) => s.status === "active");
  const inventoryUsed = (data?.inventory ?? []).filter((s: any) => s.status !== "active");

  return (
    <AppShell title="Shield Store">
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-primary/15 to-mint/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Protect your streak</h2>
              <p className="mt-1 text-xs text-muted-foreground">Each shield is spendable only in its category.</p>
            </div>
            <Shield className="h-10 w-10 text-primary" />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold capitalize ${category === c ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}>
              {c}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="capitalize text-muted-foreground">{category} balance</span>
            <span className="flex items-center gap-1 font-bold text-mint">
              <Coins className="h-4 w-4" /> {balance}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {isLoading ? <div className="col-span-3 text-center text-sm text-muted-foreground">Loading…</div> : catalogForCat.map((s: any) => (
            <div key={s.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className={`mb-3 h-2 rounded-full bg-gradient-to-r ${TIER_COLORS[s.kind]}`} />
              <h3 className="font-display text-lg font-bold capitalize">{s.kind}</h3>
              <p className="mt-1 text-xs text-muted-foreground">Protects {s.missed_days_protected} missed day{s.missed_days_protected > 1 ? "s" : ""}</p>
              <p className="text-xs text-muted-foreground">Valid {s.validity_days} days</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="flex items-center gap-1 text-sm font-bold text-mint"><Coins className="h-3.5 w-3.5" />{s.cost_credits}</span>
                <button
                  onClick={() => buyMut.mutate(s.id)}
                  disabled={balance < s.cost_credits || buyMut.isPending}
                  className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Your shields</h2>
          {inventoryActive.length === 0 && inventoryUsed.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shields yet. Buy one above.</p>
          ) : (
            <div className="space-y-2">
              {inventoryActive.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-mint/40 bg-mint/5 p-3">
                  <Shield className="h-5 w-5 text-mint" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold capitalize">{s.shield?.kind} · {s.category}</p>
                    <p className="text-[10px] text-muted-foreground">Expires {new Date(s.expires_at).toLocaleDateString()}</p>
                  </div>
                  <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-mint">Active</span>
                </div>
              ))}
              {inventoryUsed.map((s: any) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 opacity-60">
                  {s.status === "used" ? <CheckCircle2 className="h-5 w-5 text-mint" /> : <Clock className="h-5 w-5 text-muted-foreground" />}
                  <div className="flex-1">
                    <p className="text-sm font-semibold capitalize">{s.shield?.kind} · {s.category}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{s.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <Link to="/economy" className="block text-center text-xs text-primary underline">← Back to economy</Link>
      </div>
    </AppShell>
  );
}
