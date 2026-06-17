import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Flame, Dumbbell, Sparkles, Users, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ConsistencyOS — Turn habits into streaks" },
      { name: "description", content: "Check in daily, build streaks, auto-join milestone clubs, and get the group cheering you on." },
      { property: "og:title", content: "ConsistencyOS" },
      { property: "og:description", content: "Streaks. Clubs. Consistency." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Flame className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold">ConsistencyOS</span>
        </div>
        <Link to="/auth" className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          Start streak
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-5xl gap-12 px-6 py-10 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold leading-tight tracking-tight md:text-6xl"
          >
            Every check-in <span className="text-primary">cascades</span> into a streak, a milestone, a celebration.
          </motion.h1>
          <p className="mt-5 max-w-md text-muted-foreground md:text-lg">
            ConsistencyOS turns any habit — gym, running, reading, meditation — into a chain reaction. Hit milestones, auto-join clubs, and let the group light up your wins.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Build my first streak →
            </Link>
            <a href="#how" className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold hover:bg-surface-2">
              How it flows
            </a>
          </div>
        </div>

        {/* Hero flow */}
        <div className="rounded-3xl border border-border bg-surface/40 p-5 md:p-7">
          <ReferenceFlow />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">Built as a flow, top to bottom</h2>
          <p className="mt-3 text-muted-foreground">Every screen is a vertical chain. Tap a node, watch it ripple.</p>
        </div>
        <div className="mx-auto max-w-md">
          <Flow>
            <FlowNode icon={<Sparkles className="h-5 w-5" />} title="Pick a habit" subtitle="Gym, run, read, meditate, or custom" />
            <FlowNode icon={<Flame className="h-5 w-5" />} title="Check in every day" subtitle="One tap. Optional photo proof." />
            <FlowNode state="fire" icon={<Flame className="h-5 w-5" />} title="Hit a milestone" subtitle="7 / 30 / 100 / 365 days" />
            <FlowNode state="done" icon={<Users className="h-5 w-5" />} title="Auto-join the club" subtitle="Meet others who made it" />
            <FlowNode state="done" icon={<Bell className="h-5 w-5" />} title="Group cheers you on" subtitle="🔥 You completed Day 30!" />
          </Flow>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Stay consistent. Compete kindly.
      </footer>
    </div>
  );
}

function ReferenceFlow() {
  const [name, setName] = useState("User");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", user.id)
        .maybeSingle();
      const meta = user.user_metadata ?? {};
      const resolved =
        profile?.display_name ||
        profile?.username ||
        meta.full_name ||
        meta.name ||
        (user.email ? user.email.split("@")[0] : null) ||
        "User";
      if (!cancelled) setName(resolved);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Flow>
      <FlowNode delay={0} icon={<Dumbbell className="h-5 w-5" />} title={`${name} checks in at gym`} subtitle="Today, 7:14am" />
      <FlowNode delay={0.5} state="active" icon={<Flame className="h-5 w-5" />} title="Streak becomes 24 days" subtitle="+1 from yesterday" />
      <FlowNode delay={1} state="fire" icon={<Sparkles className="h-5 w-5" />} title="Achievement detected" subtitle="Closing in on Day 30" />
      <FlowNode delay={1.5} state="done" icon={<Bell className="h-5 w-5" />} title="Notification sent to group" subtitle="30-Day Club · 248 members" />
      <FlowNode delay={2} state="done" icon={<Flame className="h-5 w-5" />} title={`🔥 ${name} completed Day 24 of their gym streak!`} subtitle="System message · just now" />
    </Flow>
  );
}
