import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Flame, Send, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AppShell } from "@/components/AppShell";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { getGroupBySlug, postGroupMessage } from "@/lib/groups.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/groups/$slug")({
  component: GroupDetail,
});

function GroupDetail() {
  const { slug } = useParams({ from: "/_authenticated/groups/$slug" });
  const qc = useQueryClient();
  const queryKey = ["group", slug];

  const { data, isLoading } = useQuery({ queryKey, queryFn: () => getGroupBySlug({ data: { slug } }) });
  const [text, setText] = useState("");

  const sendMut = useMutation({
    mutationFn: () => postGroupMessage({ data: { group_id: data!.group.id, body: text } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey }); },
  });

  // Realtime subscription
  useEffect(() => {
    if (!data?.group.id) return;
    const groupId = data.group.id;
    const channel = supabase
      .channel(`grp-${groupId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupId}` }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [data?.group.id, qc, queryKey]);

  if (isLoading || !data) return <AppShell title="Club"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;

  return (
    <AppShell title={data.group.name}>
      <div className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fire/20 text-fire">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-lg font-bold">{data.group.name}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> {data.memberCount} members
            </div>
          </div>
        </div>
      </div>

      <Flow>
        {data.messages.length === 0 ? (
          <FlowNode state="pending" title="No messages yet" subtitle="Say hi to the club" />
        ) : (
          data.messages.map((m) => (
            <FlowNode
              key={m.id}
              state={m.kind === "system" ? "fire" : "active"}
              icon={<Flame className="h-5 w-5" />}
              title={m.body}
              subtitle={formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
            />
          ))
        )}
      </Flow>

      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendMut.mutate(); }}
        className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-background/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Cheer someone on…"
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit" disabled={!text.trim() || sendMut.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </AppShell>
  );
}
