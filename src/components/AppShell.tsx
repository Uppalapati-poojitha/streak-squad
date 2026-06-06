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
  coding: "bg-violet-400",
  reading: "bg-amber-300",
  gym: "bg-rose-400",
  running: "bg-sky-400",
  meditation: "bg-emerald-300",
  fasting: "bg-orange-400",
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
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-2 px-4 py-3">
          <h1 className="font-display text-lg font-bold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            {right}
            <Link
              to="/economy"
              className="flex items-center gap-1.5 rounded-full bg-mint/10 px-3 py-1.5 text-xs font-bold text-mint hover:bg-mint/20"
              title="Bond Credits"
            >
              <Coins className="h-3.5 w-3.5" />
              <span className="tabular-nums">{econ?.balance ?? 0}</span>
            </Link>
            <Link
              to="/economy"
              className="hidden items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1.5 text-[10px] font-bold text-primary sm:flex"
              title={`Level ${econ?.level ?? 1}`}
            >
              Lv {econ?.level ?? 1}
            </Link>
            <Link
              to="/inbox"
              className="relative flex h-9 w-9 items-center justify-center rounded-full bg-surface hover:bg-surface-2"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fire px-1 text-[10px] font-bold text-background">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          </div>
        </div>

        {econ && (
          <div className="mx-auto max-w-2xl space-y-1 px-4 pb-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full bg-gradient-to-r from-primary to-mint transition-all duration-500"
                style={{ width: `${econ.xpProgress}%` }}
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
              {Object.entries(econ.byCategory ?? {})
                .filter(([, v]) => (v as any).balance > 0)
                .map(([cat, v]) => (
                <Link
                  key={cat}
                  to="/shields"
                  className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground"
                  title={`${cat} credits`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_DOT[cat] ?? "bg-slate-400"}`} />
                  <span className="capitalize">{cat}</span>
                  <span className="tabular-nums text-mint">{(v as any).balance}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "fill-primary/10" : ""}`} />
                <span className="font-medium">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
