import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Globe, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { listGlobalMessages, postGlobalMessage } from "@/lib/community.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/community")({ component: CommunityPage });

function CommunityPage() {
  const qc = useQueryClient();
  const queryKey = ["global-chat"];
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => listGlobalMessages() });
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendMut = useMutation({
    mutationFn: (body: string) => postGlobalMessage({ data: { body } }),
    onSuccess: () => { setText(""); qc.invalidateQueries({ queryKey }); },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    const channel = supabase
      .channel("global-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "global_messages" }, () => {
        qc.invalidateQueries({ queryKey });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  return (
    <AppShell title="Community">
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="mb-4 overflow-hidden rounded-3xl border border-[#4f46e5]/20 bg-gradient-to-br from-[#4f46e5]/10 via-[#8b5cf6]/10 to-[#06b6d4]/10 p-5"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,0.6)]">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <div className="font-display text-lg font-bold">Global Community</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> All clubs · all streaks · one room
            </div>
          </div>
        </div>
      </motion.div>

      <div className="mb-28 space-y-2 rounded-2xl border border-border bg-surface p-3">
        {isLoading && <p className="p-4 text-sm text-muted-foreground">Loading messages…</p>}
        {!isLoading && data?.messages.length === 0 && (
          <p className="p-6 text-center text-sm text-muted-foreground">Be the first to say hi 👋</p>
        )}
        <AnimatePresence initial={false}>
          {(data?.messages ?? []).map((m) => {
            const author = data?.authors[m.author_id];
            const name = author?.display_name ?? author?.username ?? "Member";
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex gap-3 rounded-xl p-2.5 hover:bg-background/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] text-xs font-bold text-white">
                  {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">{name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="break-words text-sm text-foreground/90">{m.body}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); if (text.trim()) sendMut.mutate(text.trim()); }}
        className="fixed inset-x-0 bottom-16 z-10 border-t border-border bg-background/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3">
          <input
            value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Share progress with the whole community…"
            maxLength={500}
            className="flex-1 rounded-full border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit" disabled={!text.trim() || sendMut.isPending}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#4f46e5] to-[#8b5cf6] text-white shadow-[0_8px_20px_-6px_rgba(79,70,229,0.6)] disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </AppShell>
  );
}
