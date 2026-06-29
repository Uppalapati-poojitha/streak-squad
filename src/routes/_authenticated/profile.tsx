import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { User, Flame, Users, Sparkles, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { ShareDialog } from "@/components/ShareDialog";
import { getMyProfile } from "@/lib/groups.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const nav = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["me"], queryFn: () => getMyProfile() });

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/" });
  };

  if (isLoading || !data) return <AppShell title="Profile"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  const name = data.profile?.display_name ?? data.profile?.username ?? "You";

  return (
    <AppShell
      title="Profile"
      right={
        <div className="flex items-center gap-2">
          <ShareDialog
            title={`${name} on MomentumOS`}
            text={`🚀 I'm building consistency on MomentumOS — ${data.stats.longestStreak}-day best streak across ${data.stats.habits} habit${data.stats.habits === 1 ? "" : "s"} and ${data.stats.groups} club${data.stats.groups === 1 ? "" : "s"}. Join me!`}
          />
          <button onClick={signOut} className="flex h-9 w-9 items-center justify-center rounded-full bg-surface hover:bg-surface-2" title="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      }
    >
      <Flow>
        <FlowNode
          state="done"
          icon={<User className="h-5 w-5" />}
          title={name}
          subtitle="Building consistency, one day at a time"
        />
        <FlowNode
          state="fire"
          icon={<Flame className="h-5 w-5" />}
          title={`Longest streak: ${data.stats.longestStreak} days`}
          subtitle="Personal best"
        />
        <FlowNode
          state="active"
          icon={<Sparkles className="h-5 w-5" />}
          title={`${data.stats.habits} habit${data.stats.habits === 1 ? "" : "s"} tracked`}
          subtitle="Tap Home to check in"
        />
        <FlowNode
          state="done"
          icon={<Users className="h-5 w-5" />}
          title={`${data.stats.groups} club${data.stats.groups === 1 ? "" : "s"} joined`}
          subtitle="Auto-joined at milestones"
        />
      </Flow>
    </AppShell>
  );
}
