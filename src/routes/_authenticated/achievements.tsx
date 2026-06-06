import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listAchievements, getHeatmap } from "@/lib/achievements.functions";
import { Trophy, Flame, Shield, Star, Crown, CheckCircle2, FileText, Target, Heart, Sparkles } from "lucide-react";

const ICONS: Record<string, any> = {
  flame: Flame, shield: Shield, star: Star, crown: Crown, "check-circle": CheckCircle2,
  trophy: Trophy, "file-text": FileText, target: Target, heart: Heart, sparkles: Sparkles,
};
const TIER_BG: Record<string, string> = {
  bronze: "from-orange-700 to-orange-500",
  silver: "from-slate-400 to-slate-300",
  gold: "from-amber-400 to-yellow-300",
  platinum: "from-cyan-300 to-violet-400",
};

export const Route = createFileRoute("/_authenticated/achievements")({ component: AchievementsPage });

function AchievementsPage() {
  const { data: achievements } = useQuery({ queryKey: ["achievements"], queryFn: () => listAchievements() });
  const { data: heatmap } = useQuery({ queryKey: ["heatmap"], queryFn: () => getHeatmap() });

  // Build 52-week heatmap grid
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  const today = new Date();
  for (let w = 51; w >= 0; w--) {
    const week: Array<{ date: string; count: number }> = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (w * 7 + (6 - d)));
      const iso = date.toISOString().slice(0, 10);
      week.push({ date: iso, count: heatmap?.[iso] ?? 0 });
    }
    weeks.push(week);
  }

  const totalVerified = Object.values(heatmap ?? {}).reduce((s, v) => s + v, 0);
  const unlocked = (achievements ?? []).filter((a) => a.unlocked_at).length;

  return (
    <AppShell title="Achievements">
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-primary/20 to-mint/10 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Unlocked</p>
              <p className="font-display text-2xl font-bold">{unlocked} / {achievements?.length ?? 0}</p>
            </div>
            <Trophy className="h-10 w-10 text-primary" />
          </div>
        </div>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Contribution heatmap</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4">
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const intensity = day.count === 0 ? "bg-background" :
                      day.count === 1 ? "bg-mint/30" :
                      day.count === 2 ? "bg-mint/60" : "bg-mint";
                    return <div key={day.date} title={`${day.date}: ${day.count}`} className={`h-2.5 w-2.5 rounded-sm ${intensity}`} />;
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{totalVerified} verified check-ins in the last year</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Badges</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(achievements ?? []).map((a) => {
              const Icon = ICONS[a.icon] ?? Trophy;
              const isUnlocked = !!a.unlocked_at;
              return (
                <div key={a.id} className={`rounded-2xl border p-4 ${isUnlocked ? "border-border bg-surface" : "border-border/40 bg-surface/40 opacity-50"}`}>
                  <div className={`mb-2 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${TIER_BG[a.tier] ?? TIER_BG.bronze}`}>
                    <Icon className="h-5 w-5 text-background" />
                  </div>
                  <h3 className="text-sm font-semibold">{a.name}</h3>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{a.description}</p>
                  {isUnlocked && <p className="mt-2 text-[10px] text-mint">Unlocked</p>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
