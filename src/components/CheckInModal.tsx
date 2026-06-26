import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import { X, Sparkles, Loader2, CheckCircle2, XCircle, Flame, Coins } from "lucide-react";
import { toast } from "sonner";
import { Flow } from "@/components/flow/Flow";
import { FlowNode } from "@/components/flow/FlowNode";
import { ShareDialog } from "@/components/ShareDialog";
import { startCheckIn, submitVerification } from "@/lib/verification.functions";

type Habit = { id: string; title: string; category: string };
type Stage = "submit" | "generating" | "quiz" | "result";

const FIELDS: Record<string, Array<{ key: string; label: string; type: "text" | "number" | "textarea"; placeholder?: string }>> = {
  reading: [
    { key: "topic", label: "What did you read?", type: "text", placeholder: "Book / article / topic" },
    { key: "pages", label: "Pages", type: "number" },
    { key: "minutes", label: "Minutes", type: "number" },
  ],
  coding: [
    { key: "repo", label: "GitHub repo URL", type: "text", placeholder: "https://github.com/..." },
    { key: "snippet", label: "Code snippet or what you built", type: "textarea", placeholder: "Paste a few lines or describe..." },
  ],
  running: [
    { key: "distance_km", label: "Distance (km)", type: "number" },
    { key: "duration_min", label: "Duration (min)", type: "number" },
    { key: "notes", label: "Route / how it felt", type: "textarea" },
  ],
  gym: [
    { key: "exercises", label: "Exercises done", type: "textarea", placeholder: "e.g. bench 4x8, squats 5x5..." },
    { key: "duration_min", label: "Duration (min)", type: "number" },
  ],
  meditation: [
    { key: "minutes", label: "Minutes", type: "number" },
    { key: "style", label: "Type", type: "text", placeholder: "breath / body scan / guided..." },
  ],
  fasting: [
    { key: "hours", label: "Hours fasted", type: "number" },
    { key: "type", label: "Type", type: "text", placeholder: "16:8 / OMAD / extended..." },
  ],
  custom: [
    { key: "notes", label: "What did you do?", type: "textarea" },
  ],
};

export function CheckInModal({ habit, onClose }: { habit: Habit; onClose: () => void }) {
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>("submit");
  const [submission, setSubmission] = useState<Record<string, any>>({});
  const [checkInId, setCheckInId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Array<{ id: number; prompt: string; choices: string[] }>>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState<Awaited<ReturnType<typeof submitVerification>> | null>(null);

  const fields = FIELDS[habit.category] ?? FIELDS.custom;

  const startMut = useMutation({
    mutationFn: () =>
      startCheckIn({
        data: { habit_id: habit.id, category: habit.category as any, habit_title: habit.title, submission },
      }),
    onMutate: () => setStage("generating"),
    onSuccess: (r) => {
      setCheckInId(r.checkInId);
      setQuestions(r.questions);
      setAnswers(new Array(r.questions.length).fill(-1));
      setStage("quiz");
    },
    onError: (e: any) => {
      toast.error(e.message ?? "Failed to start verification");
      setStage("submit");
    },
  });

  const submitMut = useMutation({
    mutationFn: () =>
      submitVerification({ data: { check_in_id: checkInId!, answers } }),
    onSuccess: (r) => {
      setResult(r);
      setStage("result");
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["economy"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Verification failed"),
  });

  const allAnswered = answers.length > 0 && answers.every((a) => a >= 0);

  function answerCurrent(idx: number) {
    const next = [...answers];
    next[currentQ] = idx;
    setAnswers(next);
    if (currentQ < questions.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 250);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border-t border-border bg-surface p-6 sm:rounded-3xl sm:border"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">Verify check-in</h2>
            <p className="text-xs text-muted-foreground">{habit.title}</p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {stage === "submit" && (
            <motion.div key="submit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Submit proof of today's effort. We'll generate 5 quick questions to verify — you need 3 correct.
              </p>
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={submission[f.key] ?? ""}
                      onChange={(e) => setSubmission({ ...submission, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      rows={3}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                  ) : (
                    <input
                      type={f.type}
                      value={submission[f.key] ?? ""}
                      onChange={(e) =>
                        setSubmission({
                          ...submission,
                          [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value,
                        })
                      }
                      placeholder={f.placeholder}
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                    />
                  )}
                </div>
              ))}
              <button
                onClick={() => startMut.mutate()}
                disabled={fields.some((f) => !submission[f.key] && submission[f.key] !== 0) || startMut.isPending}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Generate verification quiz
              </button>
            </motion.div>
          )}

          {stage === "generating" && (
            <motion.div key="gen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Generating questions about your submission…</p>
            </motion.div>
          )}

          {stage === "quiz" && questions.length > 0 && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Question {currentQ + 1} of {questions.length}</span>
                <span className="text-mint">Need 3/{questions.length} correct</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-background">
                <div className="h-full bg-primary transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
              </div>

              <motion.div
                key={currentQ}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl border border-border bg-background p-4"
              >
                <p className="mb-3 font-semibold">{questions[currentQ].prompt}</p>
                <div className="space-y-2">
                  {questions[currentQ].choices.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => answerCurrent(i)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                        answers[currentQ] === i
                          ? "border-primary bg-primary/10"
                          : "border-border bg-surface hover:border-primary/40"
                      }`}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="flex-1">{c}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                  disabled={currentQ === 0}
                  className="text-xs text-muted-foreground disabled:opacity-30"
                >
                  ← Previous
                </button>
                {currentQ < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQ(currentQ + 1)}
                    className="text-xs text-primary"
                  >
                    Skip →
                  </button>
                ) : (
                  <button
                    onClick={() => submitMut.mutate()}
                    disabled={!allAnswered || submitMut.isPending}
                    className="rounded-full bg-mint px-5 py-2 text-xs font-semibold text-background disabled:opacity-50"
                  >
                    {submitMut.isPending ? "Scoring…" : "Submit"}
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {stage === "result" && result && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              {result.status === "verified" ? (
                <Flow>
                  <FlowNode
                    state="done"
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    title={`Verified ${result.score}/${result.total} ✓`}
                    subtitle="You proved you did it"
                  />
                  <FlowNode
                    state="fire"
                    delay={0.2}
                    icon={<Flame className="h-5 w-5" />}
                    title={`Day ${result.newStreak} of ${result.habitTitle}`}
                    subtitle="Streak updated"
                  />
                  <FlowNode
                    state="active"
                    delay={0.4}
                    icon={<Coins className="h-5 w-5" />}
                    title={`+${result.creditsAwarded} Bond Credits`}
                    subtitle={result.milestone ? `Milestone bonus included!` : "Base reward"}
                  />
                  {result.milestone && (result as any).clubName && (
                    <FlowNode
                      state="fire"
                      delay={0.6}
                      icon={<Sparkles className="h-5 w-5" />}
                      title={`Joined ${(result as any).clubName}`}
                      subtitle={result.message ?? ""}
                    />
                  )}

                </Flow>
              ) : (
                <Flow>
                  <FlowNode
                    state="pending"
                    icon={<XCircle className="h-5 w-5" />}
                    title={`Rejected ${result.score}/${result.total}`}
                    subtitle="Needed 3 correct. No streak, no credits."
                  />
                  <FlowNode
                    state="pending"
                    delay={0.2}
                    icon={<Sparkles className="h-5 w-5" />}
                    title="Try again tomorrow"
                    subtitle="Or refine your submission and re-attempt"
                  />
                </Flow>
              )}

              <button
                onClick={onClose}
                className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
