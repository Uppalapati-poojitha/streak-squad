import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Dumbbell, Footprints, Code, BookOpen, Brain, UtensilsCrossed, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { listPublicChallenges } from "@/lib/habits.functions";

export const Route = createFileRoute("/_authenticated/challenges")({
  component: ChallengesPage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  gym: Dumbbell, running: Footprints, coding: Code, reading: BookOpen, meditation: Brain, fasting: UtensilsCrossed, custom: Sparkles,
};

function ChallengesPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ["challenges"], queryFn: () => listPublicChallenges() });

  return (
    <AppShell title="Public challenges">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Flow>
          <FlowNode
            state="done"
            icon={<Trophy className="h-5 w-5" />}
            title="Explore challenges"
            subtitle={`${data.length} public habits to draw inspiration from`}
          />
          {data.length === 0 ? (
            <FlowNode state="pending" title="No public challenges yet" subtitle="Be the first — create a habit and mark it public" />
          ) : (
            data.map((c: any) => {
              const Icon = ICONS[c.category] ?? Sparkles;
              return (
                <FlowNode
                  key={c.id}
                  state="active"
                  icon={<Icon className="h-5 w-5" />}
                  title={c.title}
                  subtitle={`${c.target_days}-day target · ${c.category}`}
                />
              );
            })
          )}
        </Flow>
      )}
    </AppShell>
  );
}
