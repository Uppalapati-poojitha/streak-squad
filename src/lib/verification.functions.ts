import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SubmissionSchema = z.object({
  habit_id: z.string().uuid(),
  category: z.enum(["gym", "running", "coding", "reading", "meditation", "fasting", "custom"]),
  habit_title: z.string().min(1).max(120),
  submission: z.record(z.string(), z.any()),
});

type Question = { prompt: string; choices: string[]; correctIndex: number };

function buildPrompt(category: string, habitTitle: string, submission: Record<string, any>): string {
  const sub = JSON.stringify(submission);
  const guides: Record<string, string> = {
    reading: `The user claims they read "${submission.topic ?? habitTitle}" (${submission.pages ?? "?"} pages / ${submission.minutes ?? "?"} minutes). Generate 5 comprehension questions that someone who actually read this would know.`,
    coding: `The user claims they coded on repo "${submission.repo ?? "?"}" with snippet/notes: ${submission.snippet ?? submission.notes ?? "—"}. Generate 5 questions about the language, what the code does, common patterns, or concepts they'd encounter.`,
    running: `The user claims a run: ${submission.distance_km ?? "?"} km in ${submission.duration_min ?? "?"} min. Generate 5 questions about pacing, perceived effort, route, and recovery they'd answer if they really ran.`,
    gym: `The user claims a gym session with exercises: ${submission.exercises ?? "?"}. Generate 5 questions about form, sets/reps, muscle groups worked, and post-workout state.`,
    meditation: `The user claims ${submission.minutes ?? "?"} min of ${submission.style ?? "meditation"}. Generate 5 reflection/recall questions a real practitioner would answer.`,
    fasting: `The user claims a fast: ${submission.hours ?? "?"} hours, type ${submission.type ?? "?"}. Generate 5 questions about the experience, biology, and recall.`,
    custom: `Habit: "${habitTitle}". Submission: ${sub}. Generate 5 verification questions a doer would answer correctly.`,
  };
  return `${guides[category] ?? guides.custom}

Return STRICT JSON ONLY in this exact shape, no prose:
{"questions":[{"prompt":"...","choices":["A","B","C","D"],"correctIndex":0}, ...x5]}

Rules:
- Exactly 5 questions.
- Exactly 4 choices each, only one correct.
- correctIndex is 0..3.
- Questions should be answerable in 5-10 seconds, factual, no trick wording.
- Mix difficulty: 2 easy (anyone reading/doing would know), 2 medium, 1 harder.`;
}

async function generateQuestions(category: string, habitTitle: string, submission: Record<string, any>): Promise<Question[]> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You generate verification quizzes that detect whether someone actually performed a claimed habit. Output strict JSON only." },
        { role: "user", content: buildPrompt(category, habitTitle, submission) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("AI rate limit. Try again in a minute.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits.");
    throw new Error(`AI gateway error ${res.status}: ${text.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  const qs = parsed.questions;
  if (!Array.isArray(qs) || qs.length < 3) throw new Error("AI returned too few questions");

  return qs.slice(0, 5).map((q: any) => ({
    prompt: String(q.prompt ?? ""),
    choices: Array.isArray(q.choices) ? q.choices.slice(0, 4).map((c: any) => String(c)) : [],
    correctIndex: Number.isInteger(q.correctIndex) ? q.correctIndex : 0,
  })).filter((q) => q.prompt && q.choices.length === 4);
}

export const startCheckIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SubmissionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const questions = await generateQuestions(data.category, data.habit_title, data.submission);
    if (questions.length < 3) throw new Error("Could not generate enough questions, please retry");

    const { data: checkInId, error } = await supabase.rpc("start_check_in", {
      _habit_id: data.habit_id,
      _submission: data.submission,
      _questions: questions as any,
    });
    if (error) throw new Error(error.message);

    // Strip correctIndex before returning to client
    const publicQuestions = questions.map((q, i) => ({
      id: i,
      prompt: q.prompt,
      choices: q.choices,
    }));

    return { checkInId: checkInId as string, questions: publicQuestions };
  });

export const submitVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      check_in_id: z.string().uuid(),
      answers: z.array(z.number().int().min(0).max(3)).min(1).max(5),
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: result, error } = await supabase.rpc("complete_verification", {
      _check_in_id: data.check_in_id,
      _answers: data.answers as any,
    });
    if (error) throw new Error(error.message);
    return result as {
      status: "verified" | "rejected";
      score: number;
      total: number;
      creditsAwarded: number;
      newStreak?: number;
      milestone?: number | null;
      groupSlug?: string | null;
      groupName?: string | null;
      message?: string | null;
      habitTitle: string;
    };
  });
