import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Flame, Plus, Dumbbell, BookOpen, Brain, Code, Footprints, UtensilsCrossed, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { listMyHabits, createHabit, performCheckIn } from "@/lib/habits.functions";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  gym: Dumbbell,
  running: Footprints,
  coding: Code,
  reading: BookOpen,
  meditation: Brain,
  fasting: UtensilsCrossed,
  custom: Sparkles,
};

function HomePage() {
  const qc = useQueryClient();
  const { data: habits = [], isLoading } = useQuery({
    queryKey: ["habits"],
    queryFn: () => listMyHabits(),
  });
  const [creating, setCreating] = useState(false);
  const [celebration, setCelebration] = useState<null | Awaited<ReturnType<typeof performCheckIn>>>(null);

  const checkInMut = useMutation({
    mutationFn: (habit_id: string) => performCheckIn({ data: { habit_id } }),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      if (result.milestone) setCelebration(result);
      else toast.success(`Day ${result.newStreak} of ${result.habitTitle} 🔥`);
    },
    onError: (e: any) => toast.error(e.message ?? "Check-in failed"),
  });

  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <AppShell title="Today's flow">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading your flow…</p>
      ) : (
        <>
          <Flow>
            <FlowNode
              state="done"
              icon={<Flame className="h-5 w-5" />}
              title={today}
              subtitle={`${habits.filter((h) => h.checkedToday).length} of ${habits.length} done`}
            />

            {habits.length === 0 ? (
              <FlowNode
                state="pending"
                icon={<Plus className="h-5 w-5" />}
                title="No habits yet"
                subtitle="Add your first habit to start a streak"
                action={
                  <button
                    onClick={() => setCreating(true)}
                    className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Add
                  </button>
                }
              />
            ) : (
              habits.map((h) => {
                const Icon = ICONS[h.category] ?? Sparkles;
                return (
                  <FlowNode
                    key={h.id}
                    state={h.checkedToday ? "done" : h.streak >= 7 ? "fire" : "active"}
                    icon={<Icon className="h-5 w-5" />}
                    title={h.title}
                    subtitle={
                      h.streak > 0
                        ? `Day ${h.streak} streak · longest ${h.longest}`
                        : "Start your streak today"
                    }
                    action={
                      h.checkedToday ? (
                        <span className="rounded-full bg-mint/15 px-3 py-1.5 text-xs font-semibold text-mint">Done</span>
                      ) : (
                        <button
                          disabled={checkInMut.isPending}
                          onClick={() => checkInMut.mutate(h.id)}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        >
                          Check in
                        </button>
                      )
                    }
                  />
                );
              })
            )}

            <FlowNode
              state="pending"
              icon={<Plus className="h-5 w-5" />}
              title="Add another habit"
              onClick={() => setCreating(true)}
            />
          </Flow>
        </>
      )}

      <AnimatePresence>
        {creating && <CreateHabitModal onClose={() => setCreating(false)} />}
        {celebration && <MilestoneModal data={celebration} onClose={() => setCelebration(null)} />}
      </AnimatePresence>
    </AppShell>
  );
}

const CATS = [
  { value: "gym", label: "Gym", Icon: Dumbbell },
  { value: "running", label: "Running", Icon: Footprints },
  { value: "coding", label: "Coding", Icon: Code },
  { value: "reading", label: "Reading", Icon: BookOpen },
  { value: "meditation", label: "Meditation", Icon: Brain },
  { value: "fasting", label: "Fasting", Icon: UtensilsCrossed },
  { value: "custom", label: "Custom", Icon: Sparkles },
] as const;

function CreateHabitModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<(typeof CATS)[number]["value"]>("gym");
  const [targetDays, setTargetDays] = useState(30);
  const [isPublic, setIsPublic] = useState(false);

  const mut = useMutation({
    mutationFn: () => createHabit({ data: { title: title || CATS.find((c) => c.value === category)!.label, category, target_days: targetDays, is_public: isPublic } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Habit created");
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-6 sm:rounded-3xl sm:border"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">New habit</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {CATS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setCategory(value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs ${
                    category === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Title</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={CATS.find((c) => c.value === category)!.label}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold text-muted-foreground">Target days: {targetDays}</label>
            <input
              type="range" min={7} max={365} step={1}
              value={targetDays} onChange={(e) => setTargetDays(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <label className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
            <span className="text-sm">Public challenge</span>
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
          </label>

          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Create habit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MilestoneModal({ data, onClose }: { data: Awaited<ReturnType<typeof performCheckIn>>; onClose: () => void }) {
  const nav = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-fire/40 bg-surface p-6 glow-fire"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fire/20 text-3xl"
          >
            🔥
          </motion.div>
          <h2 className="font-display text-2xl font-bold">Day {data.newStreak} unlocked!</h2>
          <p className="mt-1 text-sm text-muted-foreground">{data.habitTitle}</p>
        </div>

        <div className="mt-6">
          <Flow>
            <FlowNode state="done" delay={0.3} icon={<Flame className="h-5 w-5" />} title={`Streak → Day ${data.newStreak}`} />
            <FlowNode state="fire" delay={0.6} icon={<Sparkles className="h-5 w-5" />} title="Achievement detected" subtitle={`${data.milestone}-day milestone`} />
            <FlowNode state="done" delay={0.9} icon={<Flame className="h-5 w-5" />} title={`Joined ${data.groupName}`} subtitle="Auto-membership" />
            <FlowNode state="done" delay={1.2} icon={<Flame className="h-5 w-5" />} title={data.message ?? ""} subtitle="Sent to your club" />
          </Flow>
        </div>

        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border bg-background py-3 text-sm font-semibold">
            Close
          </button>
          <button
            onClick={() => { onClose(); if (data.groupSlug) nav({ to: "/groups/$slug", params: { slug: data.groupSlug } }); }}
            className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Visit club
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
