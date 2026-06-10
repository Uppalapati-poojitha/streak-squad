import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users, Flame, Globe, ArrowRight } from "lucide-react";
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
      <Link
        to="/community"
        className="mb-5 flex items-center gap-3 overflow-hidden rounded-2xl border border-[#4f46e5]/20 bg-gradient-to-br from-[#4f46e5]/10 via-[#8b5cf6]/10 to-[#06b6d4]/10 p-4 transition hover:border-[#4f46e5]/40 hover:shadow-[0_10px_30px_-12px_rgba(79,70,229,0.4)]"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] text-white">
          <Globe className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">Global Community</div>
          <div className="text-[11px] text-muted-foreground">Chat with members of every club, any streak</div>
        </div>
        <ArrowRight className="h-4 w-4 text-[#4f46e5]" />
      </Link>

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
