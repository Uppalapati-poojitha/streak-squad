import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { getClub, postClubMessage } from "@/lib/clubs.functions";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useState } from "react";
import { Send, Users, Trophy, Activity, MessageCircle, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/clubs/$slug")({ component: ClubPage });

function ClubPage() {
  const { slug } = useParams({ from: "/_authenticated/clubs/$slug" });
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["club", slug], queryFn: () => getClub({ data: { slug } }) });
  const [tab, setTab] = useState<"chat" | "feed" | "leaderboard" | "members">("chat");
  const [draft, setDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const clubId = data?.club?.id;

  useEffect(() => {
    if (!clubId) return;
    const channel = supabase.channel(`club:${clubId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${clubId}` },
        () => { qc.invalidateQueries({ queryKey: ["club", slug] }); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clubId, slug, qc]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  const post = useMutation({
    mutationFn: () => postClubMessage({ data: { group_id: clubId!, body: draft } }),
    onSuccess: () => { setDraft(""); qc.invalidateQueries({ queryKey: ["club", slug] }); },
    onError: (e: any) => toast.error(e.message ?? "Send failed"),
  });

  if (isLoading) return <AppShell title="Club"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  if (!data) return <AppShell title="Club"><p className="text-sm text-muted-foreground">Not a member.</p></AppShell>;

  return (
    <AppShell title={data.club.name}>
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { id: "chat", label: "Chat", icon: MessageCircle },
            { id: "feed", label: "Feed", icon: Activity },
            { id: "leaderboard", label: "Leaderboard", icon: Trophy },
            { id: "members", label: "Members", icon: Users },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id as any)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        {tab === "chat" && (
          <div className="flex h-[60vh] flex-col rounded-2xl border border-border bg-surface">
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {data.messages.length === 0 && <p className="text-center text-xs text-muted-foreground">Be the first to say hi 👋</p>}
              {data.messages.map((m: any) => {
                const author = data.members.find((mb: any) => mb.user_id === m.author_id);
                const isSystem = m.kind === "system" || !m.author_id;
                return (
                  <div key={m.id} className={isSystem ? "rounded-lg bg-primary/5 px-3 py-2 text-xs text-primary" : "flex gap-2"}>
                    {!isSystem && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold">
                        {(author?.profile?.display_name ?? "?")[0]}
                      </div>
                    )}
                    <div className="flex-1">
                      {!isSystem && <p className="text-[10px] font-semibold text-muted-foreground">{author?.profile?.display_name ?? author?.profile?.username ?? "Member"}</p>}
                      <p className="text-sm">{m.body}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (draft.trim()) post.mutate(); }}
              className="flex gap-2 border-t border-border p-3">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500}
                placeholder="Message the club…"
                className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary" />
              <button type="submit" disabled={!draft.trim() || post.isPending}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        )}

        {tab === "feed" && (
          <div className="space-y-2">
            {data.feed.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            {data.feed.map((f: any) => (
              <div key={f.id} className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-sm">{f.payload?.message ?? f.kind}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{new Date(f.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="space-y-2">
            {data.leaderboard.length === 0 && <p className="text-sm text-muted-foreground">No streaks yet.</p>}
            {data.leaderboard.map((row, i) => (
              <div key={row.user_id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${i === 0 ? "bg-amber-400 text-background" : i === 1 ? "bg-slate-300 text-background" : i === 2 ? "bg-orange-600 text-background" : "bg-surface-2 text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{row.display_name}</p>
                  <p className="text-[10px] text-muted-foreground">🔥 {row.current_streak} day streak · {row.lifetime} credits</p>
                </div>
                {i === 0 && <Crown className="h-4 w-4 text-amber-400" />}
              </div>
            ))}
          </div>
        )}

        {tab === "members" && (
          <div className="space-y-2">
            {data.members.map((m: any) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-bold">
                  {(m.profile?.display_name ?? "?")[0]}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{m.profile?.display_name ?? m.profile?.username ?? "Member"}</p>
                  <p className="text-[10px] text-muted-foreground">Joined {new Date(m.joined_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Link to="/groups" className="block text-center text-xs text-primary underline">← All clubs</Link>
      </div>
    </AppShell>
  );
}
