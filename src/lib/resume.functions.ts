import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ResumeInputSchema = z.object({
  template: z.enum(["modern", "classic", "minimal"]).default("modern"),
  personal: z.object({
    name: z.string().min(1).max(120),
    title: z.string().max(120).optional(),
    email: z.string().email().max(255),
    phone: z.string().max(40).optional(),
    location: z.string().max(120).optional(),
    website: z.string().max(255).optional(),
    linkedin: z.string().max(255).optional(),
  }),
  education: z.array(z.object({
    school: z.string().max(160), degree: z.string().max(160),
    field: z.string().max(160).optional(), start: z.string().max(40).optional(),
    end: z.string().max(40).optional(), gpa: z.string().max(20).optional(),
  })).max(6),
  skills: z.array(z.string().min(1).max(40)).max(40),
  projects: z.array(z.object({
    name: z.string().max(120), description: z.string().max(800),
    link: z.string().max(255).optional(), tech: z.string().max(200).optional(),
  })).max(8),
  experience: z.array(z.object({
    company: z.string().max(160), role: z.string().max(160),
    start: z.string().max(40).optional(), end: z.string().max(40).optional(),
    description: z.string().max(1500).optional(),
  })).max(8),
  target_role: z.string().max(160).optional(),
});

export const generateResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ResumeInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Gate: user must have redeemed the resume-builder reward
    const { data: reward } = await supabase.from("rewards").select("id").eq("slug", "resume-builder").maybeSingle();
    if (!reward) throw new Error("Resume reward not configured");
    const { data: redemption } = await supabase
      .from("reward_redemptions").select("id").eq("user_id", userId).eq("reward_id", reward.id).maybeSingle();
    if (!redemption) throw new Error("Redeem the AI Resume Builder reward first");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const prompt = `You are an expert ATS-friendly resume writer. Given the candidate's raw data, return a polished resume payload as STRICT JSON only:
{
  "summary": "3-4 sentence professional summary tailored to the target role",
  "skills_grouped": [{"label": "Languages", "items": ["..."]}, {"label": "Frameworks", "items": ["..."]}],
  "experience_bullets": [{"index": 0, "bullets": ["action verb + metric bullet 1", "..."]}],
  "project_bullets": [{"index": 0, "bullets": ["..."]}],
  "keywords": ["ATS keyword 1", "..."]
}
Target role: ${data.target_role ?? "Software Engineer"}.
Skills: ${data.skills.join(", ")}.
Experience: ${JSON.stringify(data.experience)}.
Projects: ${JSON.stringify(data.projects)}.
Education: ${JSON.stringify(data.education)}.
Return only JSON, no prose.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "You output ATS-optimized resume JSON. Strict JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("AI rate limit, try again in a moment");
      if (res.status === 402) throw new Error("AI credits exhausted");
      throw new Error(`AI error ${res.status}`);
    }
    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    let ai: any = {};
    try { ai = JSON.parse(content ?? "{}"); } catch { ai = {}; }

    const fullPayload = {
      ...data,
      ai_summary: String(ai.summary ?? ""),
      skills_grouped: Array.isArray(ai.skills_grouped) ? ai.skills_grouped : [{ label: "Skills", items: data.skills }],
      experience_bullets: Array.isArray(ai.experience_bullets) ? ai.experience_bullets : [],
      project_bullets: Array.isArray(ai.project_bullets) ? ai.project_bullets : [],
      keywords: Array.isArray(ai.keywords) ? ai.keywords : [],
    };

    const { data: saved, error } = await supabase
      .from("user_resumes")
      .insert({ user_id: userId, template: data.template, payload: fullPayload as any })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Unlock "resume_builder" achievement
    const { data: ach } = await supabase.from("achievements").select("id").eq("slug", "resume_builder").maybeSingle();
    if (ach) await supabase.from("user_achievements").insert({ user_id: userId, achievement_id: ach.id }).select();

    return { id: saved.id, payload: fullPayload };
  });

export const listResumes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_resumes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10);
    return data ?? [];
  });
