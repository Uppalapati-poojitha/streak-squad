import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Trophy, Users, Bell, User, Coins, Gift } from "lucide-react";
import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUnreadCount } from "@/hooks/useUnreadCount";
import { getMyEconomy } from "@/lib/economy.functions";

const tabs = [
  { to: "/home", icon: Home, label: "Home" },
  { to: "/challenges", icon: Trophy, label: "Habits" },
  { to: "/rewards", icon: Gift, label: "Rewards" },
  { to: "/groups", icon: Users, label: "Groups" },
  { to: "/profile", icon: User, label: "Me" },
] as const;

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
          <div className="mx-auto max-w-2xl px-4 pb-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full bg-gradient-to-r from-primary to-mint transition-all duration-500"
                style={{ width: `${econ.xpProgress}%` }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-xs transition-colors ${
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className={`h-5 w-5 ${active ? "fill-primary/10" : ""}`} />
                <span className="font-medium">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
