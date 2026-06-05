import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { listMyGroups } from "@/lib/groups.functions";

export const Route = createFileRoute("/_authenticated/groups/")({
  component: GroupsPage,
});

function GroupsPage() {
  const { data: groups = [], isLoading } = useQuery({ queryKey: ["groups"], queryFn: () => listMyGroups() });

  return (
    <AppShell title="Milestone clubs">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading clubs…</p>
      ) : (
        <Flow>
          <FlowNode
            state="done"
            icon={<Users className="h-5 w-5" />}
            title="Your clubs"
            subtitle="Auto-join when you hit a milestone"
          />
          {groups.map((g) => (
            <FlowNodeLink key={g.id} g={g} />
          ))}
        </Flow>
      )}
    </AppShell>
  );
}

function FlowNodeLink({ g }: { g: { id: string; slug: string; name: string; threshold: number; joined: boolean } }) {
  const node = (
    <FlowNode
      state={g.joined ? "fire" : "pending"}
      icon={<Flame className="h-5 w-5" />}
      title={g.name}
      subtitle={g.joined ? "Member · tap to open" : `Reach a ${g.threshold}-day streak to join`}
      action={
        g.joined ? <span className="text-xs font-semibold text-mint">→</span> : <span className="text-xs text-muted-foreground">Locked</span>
      }
    />
  );
  if (!g.joined) return node;
  return <Link to="/groups/$slug" params={{ slug: g.slug }}>{node}</Link>;
}
