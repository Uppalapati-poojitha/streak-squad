import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppShell } from "@/components/AppShell";
import { listAchievements, getHeatmap } from "@/lib/achievements.functions";
import {
  Trophy, Shield, ShieldCheck, BadgeCheck, Target, CalendarDays,
  Rocket, Briefcase, Swords, Castle, Award, Bird, Lock, Sparkles, CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

// Map each achievement slug to its themed icon
const SLUG_ICON: Record<string, any> = {
  streak_7: Swords,
  streak_30: CalendarDays,
  streak_100: Award,
  streak_365: ShieldCheck,
  first_shield: Shield,
  first_verify: BadgeCheck,
  perfect_quiz: Target,
  club_champion: Trophy,
  five_categories: Castle,
  resume_builder: Briefcase,
  mission_master: Rocket,
  social_butterfly: Bird,
};

type Rarity = "Common" | "Rare" | "Epic" | "Legendary";

type RarityMeta = {
  rarity: Rarity;
  // strong icon + progress gradient
  gradient: string;
  // soft card background gradient
  cardBg: string;
  // border / ring tint
  ring: string;
  border: string;
  // outer glow when unlocked
  glow: string;
  // rarity chip
  chip: string;
  // accent dot
  dot: string;
  // glow rgb for hover shadow
  hoverGlow: string;
};

const TIER_META: Record<string, RarityMeta> = {
  // Common → Green
  bronze: {
    rarity: "Common",
    gradient: "from-[#34d399] via-[#22c55e] to-[#16a34a]",
    cardBg: "from-[#ecfdf5] via-white to-[#f0fdf4]",
    ring: "ring-[#22c55e]/45",
    border: "border-[#22c55e]/40",
    glow: "shadow-[0_18px_45px_-18px_rgba(34,197,94,0.55)]",
    chip: "text-[#15803d] bg-[#22c55e]/15 border-[#22c55e]/35",
    dot: "bg-[#22c55e]",
    hoverGlow: "hover:shadow-[0_25px_60px_-15px_rgba(34,197,94,0.55)]",
  },
  // Rare → Blue + Cyan
  silver: {
    rarity: "Rare",
    gradient: "from-[#3b82f6] via-[#06b6d4] to-[#0891b2]",
    cardBg: "from-[#eff6ff] via-white to-[#ecfeff]",
    ring: "ring-[#06b6d4]/45",
    border: "border-[#06b6d4]/40",
    glow: "shadow-[0_18px_45px_-18px_rgba(6,182,212,0.6)]",
    chip: "text-[#0e7490] bg-[#06b6d4]/15 border-[#06b6d4]/35",
    dot: "bg-[#06b6d4]",
    hoverGlow: "hover:shadow-[0_25px_60px_-15px_rgba(59,130,246,0.55)]",
  },
  // Epic → Orange + Amber
  gold: {
    rarity: "Epic",
    gradient: "from-[#fbbf24] via-[#f59e0b] to-[#ea580c]",
    cardBg: "from-[#fffbeb] via-white to-[#fff7ed]",
    ring: "ring-[#f59e0b]/55",
    border: "border-[#f59e0b]/45",
    glow: "shadow-[0_20px_50px_-18px_rgba(245,158,11,0.65)]",
    chip: "text-[#b45309] bg-[#f59e0b]/15 border-[#f59e0b]/40",
    dot: "bg-[#f59e0b]",
    hoverGlow: "hover:shadow-[0_28px_65px_-15px_rgba(245,158,11,0.6)]",
  },
  // Legendary → Purple + Gold
  platinum: {
    rarity: "Legendary",
    gradient: "from-[#8b5cf6] via-[#a855f7] to-[#fbbf24]",
    cardBg: "from-[#faf5ff] via-white to-[#fffbeb]",
    ring: "ring-[#a855f7]/60",
    border: "border-[#a855f7]/50",
    glow: "shadow-[0_22px_55px_-16px_rgba(168,85,247,0.7)]",
    chip: "text-[#6d28d9] bg-gradient-to-r from-[#8b5cf6]/15 to-[#fbbf24]/15 border-[#a855f7]/40",
    dot: "bg-gradient-to-r from-[#a855f7] to-[#fbbf24]",
    hoverGlow: "hover:shadow-[0_32px_70px_-14px_rgba(168,85,247,0.65)]",
  },
};

export const Route = createFileRoute("/_authenticated/achievements")({ component: AchievementsPage });

function AchievementsPage() {
  const { data } = useQuery({ queryKey: ["achievements"], queryFn: () => listAchievements() });
  const { data: heatmap } = useQuery({ queryKey: ["heatmap"], queryFn: () => getHeatmap() });

  const items = data?.items ?? [];
  const unlocked = items.filter((a) => a.unlocked_at).length;
  const total = items.length;
  const completionPct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  // 52-week heatmap
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

  // Order: legendary first then by unlocked
  const ordered = items.slice().sort((a, b) => {
    const order = { platinum: 0, gold: 1, silver: 2, bronze: 3 } as Record<string, number>;
    return (order[a.tier] ?? 9) - (order[b.tier] ?? 9);
  });

  return (
    <AppShell title="Badges">
      <div className="space-y-6">
        {/* Hero stat */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="overflow-hidden rounded-3xl border border-[#8b5cf6]/20 bg-gradient-to-br from-[#4f46e5]/10 via-[#8b5cf6]/10 to-[#f59e0b]/10 p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Achievements unlocked</p>
              <p className="mt-1 font-display text-3xl font-bold">
                <span className="bg-gradient-to-r from-[#4f46e5] to-[#8b5cf6] bg-clip-text text-transparent">{unlocked}</span>
                <span className="text-muted-foreground"> / {total}</span>
              </p>
              <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-surface-2">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${completionPct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[#4f46e5] via-[#8b5cf6] to-[#f59e0b]"
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{completionPct}% collection complete</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#ea580c] shadow-[0_10px_30px_-8px_rgba(245,158,11,0.7)]">
              <Trophy className="h-8 w-8 text-white" />
            </div>
          </div>
        </motion.div>

        {/* Heatmap */}
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Contribution heatmap</h2>
          <div className="overflow-x-auto rounded-2xl border border-border bg-surface p-4">
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const intensity = day.count === 0 ? "bg-background border border-border/50" :
                      day.count === 1 ? "bg-[#22c55e]/40" :
                      day.count === 2 ? "bg-[#22c55e]/70" : "bg-[#22c55e]";
                    return <div key={day.date} title={`${day.date}: ${day.count}`} className={`h-2.5 w-2.5 rounded-sm ${intensity}`} />;
                  })}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{totalVerified} verified check-ins in the last year</p>
          </div>
        </section>

        {/* Badges grid */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Badge collection</h2>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#22c55e]" />Common</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#06b6d4]" />Rare</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f59e0b]" />Epic</span>
              <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#8b5cf6]" />Legendary</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ordered.map((a, idx) => {
              const Icon = ICONS[a.icon] ?? Trophy;
              const meta = TIER_META[a.tier] ?? TIER_META.bronze;
              const isUnlocked = !!a.unlocked_at;
              const progressPct = a.target && a.progress !== null
                ? Math.round((a.progress / a.target) * 100)
                : isUnlocked ? 100 : 0;

              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.4) }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`group relative overflow-hidden rounded-2xl border bg-surface p-4 transition-all ${
                    isUnlocked
                      ? `border-transparent ring-1 ${meta.ring} ${meta.glow} hover:shadow-[0_0_60px_-6px_rgba(139,92,246,0.6)]`
                      : "border-border/50"
                  }`}
                >
                  {/* Legendary shimmer */}
                  {isUnlocked && a.tier === "platinum" && (
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-40"
                      animate={{ backgroundPosition: ["0% 50%", "200% 50%"] }}
                      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
                      style={{
                        backgroundImage: "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
                        backgroundSize: "200% 100%",
                      }}
                    />
                  )}

                  <div className="relative">
                    <div className={`mb-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${meta.gradient} ${
                      isUnlocked ? "" : "opacity-30 grayscale"
                    }`}>
                      {isUnlocked ? (
                        <Icon className="h-6 w-6 text-white" />
                      ) : (
                        <Lock className="h-5 w-5 text-white" />
                      )}
                    </div>

                    <span className={`mb-1.5 inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${meta.label}`}>
                      {meta.rarity}
                    </span>

                    <h3 className={`text-sm font-bold leading-tight ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                      {a.name}
                    </h3>
                    <p className={`mt-0.5 text-[10px] leading-snug ${isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70 blur-[0.3px]"}`}>
                      {a.description}
                    </p>

                    {/* Progress bar */}
                    {a.target !== null && (
                      <div className="mt-3 space-y-1">
                        <div className="flex justify-between text-[9px] font-semibold text-muted-foreground">
                          <span className="tabular-nums">{a.progress ?? 0} / {a.target}</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.8, delay: 0.1 + idx * 0.02 }}
                            className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`}
                          />
                        </div>
                      </div>
                    )}

                    {/* Earned date */}
                    {isUnlocked && a.unlocked_at && (
                      <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-[#16a34a]">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Earned {format(new Date(a.unlocked_at), "MMM d, yyyy")}
                      </p>
                    )}
                    {!isUnlocked && a.target === null && (
                      <p className="mt-2 text-[9px] font-semibold text-muted-foreground">Locked</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
