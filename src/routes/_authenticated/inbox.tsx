import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Bell, Flame } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/AppShell";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { listNotifications, markNotificationsRead } from "@/lib/groups.functions";

export const Route = createFileRoute("/_authenticated/inbox")({
  component: InboxPage,
});

function InboxPage() {
  const qc = useQueryClient();
  const { data: notifs = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => listNotifications(),
  });

  const markMut = useMutation({
    mutationFn: () => markNotificationsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    if (notifs.some((n: any) => !n.read_at)) markMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifs.length]);

  return (
    <AppShell title="Inbox">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Flow>
          <FlowNode
            state="done"
            icon={<Bell className="h-5 w-5" />}
            title="Your activity"
            subtitle={`${notifs.length} recent events`}
          />
          {notifs.length === 0 ? (
            <FlowNode state="pending" title="No notifications yet" subtitle="Hit your first milestone to fill this up" />
          ) : (
            notifs.map((n: any) => {
              const slug = n.payload?.group_slug;
              const node = (
                <FlowNode
                  state={n.read_at ? "active" : "fire"}
                  icon={<Flame className="h-5 w-5" />}
                  title={n.payload?.message ?? "New activity"}
                  subtitle={formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                />
              );
              return slug ? <Link key={n.id} to="/groups/$slug" params={{ slug }}>{node}</Link> : <div key={n.id}>{node}</div>;
            })
          )}
        </Flow>
      )}
    </AppShell>
  );
}
