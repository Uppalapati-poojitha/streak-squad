import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Trophy, Bell, User, Coins, Gift, Shield, Target } from "lucide-react";
import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { getMyEconomy } from "@/lib/economy.functions";

const tabs = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/missions", icon: Target, label: "Missions" },
  { to: "/shields", icon: Shield, label: "Shields" },
  { to: "/rewards", icon: Gift, label: "Rewards" },
  { to: "/achievements", icon: Trophy, label: "Badges" },
  { to: "/profile", icon: User, label: "Me" },
] as const;

const CATEGORY_DOT: Record<string, string> = {
  coding: "bg-[#8b5cf6]",
  reading: "bg-[#f59e0b]",
  gym: "bg-[#ef4444]",
  running: "bg-[#06b6d4]",
  meditation: "bg-[#22c55e]",
  fasting: "bg-[#f97316]",
  custom: "bg-slate-400",
};

export function AppShell({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const unread = useUnreadCount();
  const { data: econ } = useQuery({
    queryKey: ["economy"],
    queryFn: () => getMyEconomy(),
    staleTime: 10_000,
  });

  return (
    <div className="relative min-h-screen bg-background pb-28">
      {/* Ambient brand glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%, rgba(79,70,229,0.10), transparent 60%), radial-gradient(40% 40% at 85% 10%, rgba(6,182,212,0.10), transparent 70%), radial-gradient(40% 40% at 10% 0%, rgba(139,92,246,0.10), transparent 70%)",
        }}
      />

      <header className="sticky top-0 z-20 border-b border-border/70 glass-strong">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl gradient-brand shadow-[0_8px_24px_-8px_rgba(79,70,229,0.55)]">
              <span className="text-sm font-black text-white">M</span>
            </div>
            <h1 className="font-display text-lg font-bold tracking-tight text-foreground">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {right}
            <Link
              to="/economy"
              className="flex items-center gap-1.5 rounded-full border border-[#22c55e]/30 bg-[#22c55e]/10 px-3 py-1.5 text-xs font-bold text-[#16a34a] transition hover:bg-[#22c55e]/15"
              title="Bond Credits"
            >
              <Coins className="h-3.5 w-3.5" />
              <span className="tabular-nums">{econ?.balance ?? 0}</span>
            </Link>
            <Link
              to="/economy"
              className="hidden items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary sm:flex"
              title={`Level ${econ?.level ?? 1}`}
            >
              Lv {econ?.level ?? 1}
            </Link>
            <Link
              to="/inbox"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground transition hover:border-primary/30 hover:text-primary"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white gradient-fire">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          </div>
        </div>

        {econ && (
          <div className="mx-auto max-w-2xl space-y-1.5 px-4 pb-3">
            <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground">
              <span>Level {econ.level ?? 1}</span>
              <span className="tabular-nums">{Math.round(econ.xpProgress ?? 0)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full gradient-brand transition-all duration-500"
                style={{ width: `${econ.xpProgress}%` }}
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-none">
              {Object.entries(econ.byCategory ?? {})
                .filter(([, v]) => (v as any).balance > 0)
                .map(([cat, v]) => (
                <Link
                  key={cat}
                  to="/shields"
                  className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                  title={`${cat} credits`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[cat] ?? "bg-slate-400"}`} />
                  <span className="capitalize">{cat}</span>
                  <span className="tabular-nums text-[#16a34a]">{(v as any).balance}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 glass-strong">
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`group relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] transition-all ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-3 -top-2 h-0.5 rounded-full gradient-brand" />
                )}
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all ${
                    active
                      ? "bg-primary/10 ring-1 ring-primary/20"
                      : "group-hover:bg-surface"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-semibold">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
