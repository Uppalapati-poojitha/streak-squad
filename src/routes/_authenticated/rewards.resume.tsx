import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { listResumes, generateResume } from "@/lib/resume.functions";
import { listRewards } from "@/lib/economy.functions";
import { FileText, Download, Sparkles, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/rewards/resume")({ component: ResumePage });

const TEMPLATES = ["modern", "classic", "minimal"] as const;

function ResumePage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: rewards } = useQuery({ queryKey: ["rewards"], queryFn: () => listRewards() });
  const { data: resumes } = useQuery({ queryKey: ["resumes"], queryFn: () => listResumes() });
  const unlocked = (rewards ?? []).find((r) => r.slug === "resume-builder")?.owned;

  const [template, setTemplate] = useState<typeof TEMPLATES[number]>("modern");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<any>({
    personal: { name: "", title: "", email: "", phone: "", location: "", website: "", linkedin: "" },
    education: [{ school: "", degree: "", field: "", start: "", end: "", gpa: "" }],
    skills: [] as string[],
    skillInput: "",
    projects: [{ name: "", description: "", link: "", tech: "" }],
    experience: [{ company: "", role: "", start: "", end: "", description: "" }],
    target_role: "",
  });
  const [preview, setPreview] = useState<any | null>(null);

  const gen = useMutation({
    mutationFn: () => generateResume({
      data: {
        template,
        personal: form.personal,
        education: form.education.filter((e: any) => e.school),
        skills: form.skills,
        projects: form.projects.filter((p: any) => p.name),
        experience: form.experience.filter((e: any) => e.company),
        target_role: form.target_role || undefined,
      },
    }),
    onSuccess: (r) => {
      setPreview({ id: r.id, ...r.payload, template });
      qc.invalidateQueries({ queryKey: ["resumes"] });
      toast.success("Resume generated!");
    },
    onError: (e: any) => toast.error(e.message ?? "Generation failed"),
  });

  if (!unlocked) {
    return (
      <AppShell title="AI Resume Builder">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-6 text-center">
          <FileText className="mx-auto h-10 w-10 text-primary" />
          <h2 className="font-display text-xl font-bold">Locked</h2>
          <p className="text-sm text-muted-foreground">Redeem the "AI Resume Builder" reward in the Rewards Marketplace to unlock.</p>
          <button onClick={() => nav({ to: "/rewards" })} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Go to Rewards
          </button>
        </div>
      </AppShell>
    );
  }

  if (preview) {
    return (
      <AppShell title="Your Resume">
        <ResumePreview r={preview} onBack={() => setPreview(null)} />
      </AppShell>
    );
  }

  const steps = ["Personal", "Education", "Skills", "Projects", "Experience", "Generate"];
  return (
    <AppShell title="AI Resume Builder">
      <div className="space-y-5">
        <div className="flex gap-2 overflow-x-auto">
          {steps.map((s, i) => (
            <button key={s} onClick={() => setStep(i)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${step === i ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}>{i + 1}. {s}</button>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-2">
            {[
              ["name", "Full name"], ["title", "Headline (e.g. Senior Engineer)"],
              ["email", "Email"], ["phone", "Phone"], ["location", "Location"],
              ["website", "Website"], ["linkedin", "LinkedIn URL"],
            ].map(([k, label]) => (
              <input key={k} placeholder={label} value={form.personal[k] ?? ""}
                onChange={(e) => setForm({ ...form, personal: { ...form.personal, [k]: e.target.value } })}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            ))}
            <input placeholder="Target role (helps AI tailor)" value={form.target_role}
              onChange={(e) => setForm({ ...form, target_role: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
          </div>
        )}

        {step === 1 && (
          <ListEditor list={form.education} onChange={(l) => setForm({ ...form, education: l })}
            template={{ school: "", degree: "", field: "", start: "", end: "", gpa: "" }}
            fields={["school", "degree", "field", "start", "end", "gpa"]} />
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input value={form.skillInput} onChange={(e) => setForm({ ...form, skillInput: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter" && form.skillInput.trim()) { setForm({ ...form, skills: [...form.skills, form.skillInput.trim()], skillInput: "" }); }}}
                placeholder="Add a skill, press Enter"
                className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary" />
            </div>
            <div className="flex flex-wrap gap-2">
              {form.skills.map((s: string, i: number) => (
                <span key={i} className="flex items-center gap-1 rounded-full bg-surface px-3 py-1 text-xs">
                  {s} <button onClick={() => setForm({ ...form, skills: form.skills.filter((_: any, j: number) => j !== i) })} className="text-muted-foreground">×</button>
                </span>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <ListEditor list={form.projects} onChange={(l) => setForm({ ...form, projects: l })}
            template={{ name: "", description: "", link: "", tech: "" }}
            fields={["name", "tech", "link", "description"]} textareas={["description"]} />
        )}

        {step === 4 && (
          <ListEditor list={form.experience} onChange={(l) => setForm({ ...form, experience: l })}
            template={{ company: "", role: "", start: "", end: "", description: "" }}
            fields={["company", "role", "start", "end", "description"]} textareas={["description"]} />
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {TEMPLATES.map((t) => (
                <button key={t} onClick={() => setTemplate(t)}
                  className={`flex-1 rounded-xl border p-3 text-xs font-semibold capitalize ${template === t ? "border-primary bg-primary/10" : "border-border bg-surface"}`}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => gen.mutate()} disabled={gen.isPending || !form.personal.name || !form.personal.email}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-40">
              <Sparkles className="h-4 w-4" /> {gen.isPending ? "Generating with AI…" : "Generate Resume"}
            </button>
          </div>
        )}

        <div className="flex justify-between">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="text-xs text-muted-foreground disabled:opacity-30">← Back</button>
          <button onClick={() => setStep(Math.min(steps.length - 1, step + 1))} disabled={step === steps.length - 1} className="text-xs text-primary disabled:opacity-30">Next →</button>
        </div>

        {(resumes ?? []).length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-sm font-bold">Past resumes</h2>
            <div className="space-y-2">
              {(resumes ?? []).map((r: any) => (
                <button key={r.id} onClick={() => setPreview({ id: r.id, ...r.payload })}
                  className="flex w-full items-center gap-2 rounded-xl border border-border bg-surface p-3 text-left hover:border-primary">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-sm">{r.payload?.personal?.name ?? "Resume"} · {r.template}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

function ListEditor({ list, onChange, template, fields, textareas = [] }: { list: any[]; onChange: (l: any[]) => void; template: any; fields: string[]; textareas?: string[] }) {
  return (
    <div className="space-y-3">
      {list.map((item, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-border bg-surface p-3">
          <div className="flex justify-end">
            <button onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-muted-foreground"><Trash2 className="h-3 w-3" /></button>
          </div>
          {fields.map((f) => textareas.includes(f) ? (
            <textarea key={f} placeholder={f} rows={3} value={item[f] ?? ""}
              onChange={(e) => { const n = [...list]; n[i] = { ...item, [f]: e.target.value }; onChange(n); }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary" />
          ) : (
            <input key={f} placeholder={f} value={item[f] ?? ""}
              onChange={(e) => { const n = [...list]; n[i] = { ...item, [f]: e.target.value }; onChange(n); }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary" />
          ))}
        </div>
      ))}
      <button onClick={() => onChange([...list, { ...template }])} className="flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-border py-3 text-xs text-muted-foreground hover:border-primary">
        <Plus className="h-3 w-3" /> Add
      </button>
    </div>
  );
}

function ResumePreview({ r, onBack }: { r: any; onBack: () => void }) {
  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    let y = 50;
    doc.setFont("helvetica", "bold").setFontSize(20).text(r.personal?.name ?? "", 50, y);
    y += 22;
    doc.setFontSize(11).setFont("helvetica", "normal");
    if (r.personal?.title) { doc.text(r.personal.title, 50, y); y += 16; }
    const contact = [r.personal?.email, r.personal?.phone, r.personal?.location, r.personal?.linkedin].filter(Boolean).join(" · ");
    if (contact) { doc.text(contact, 50, y); y += 20; }

    const section = (title: string) => {
      y += 6;
      doc.setFont("helvetica", "bold").setFontSize(13).text(title.toUpperCase(), 50, y);
      doc.setLineWidth(0.5).line(50, y + 3, 560, y + 3);
      y += 16;
      doc.setFont("helvetica", "normal").setFontSize(10);
    };
    const para = (text: string, indent = 50) => {
      const lines = doc.splitTextToSize(text, 510 - (indent - 50));
      doc.text(lines, indent, y);
      y += lines.length * 12;
    };

    if (r.ai_summary) { section("Summary"); para(r.ai_summary); }

    if (r.skills_grouped?.length) {
      section("Skills");
      for (const g of r.skills_grouped) {
        doc.setFont("helvetica", "bold").text(`${g.label}: `, 50, y);
        doc.setFont("helvetica", "normal");
        para(Array.isArray(g.items) ? g.items.join(", ") : "", 110);
      }
    }

    if (r.experience?.length) {
      section("Experience");
      r.experience.forEach((e: any, i: number) => {
        doc.setFont("helvetica", "bold").setFontSize(11).text(`${e.role} — ${e.company}`, 50, y);
        doc.setFont("helvetica", "normal").setFontSize(9).text(`${e.start ?? ""} – ${e.end ?? "Present"}`, 450, y);
        y += 14;
        doc.setFontSize(10);
        const bullets = r.experience_bullets?.find((b: any) => b.index === i)?.bullets ?? [];
        for (const b of bullets) { para(`• ${b}`, 60); }
        if (e.description) para(e.description, 60);
        y += 4;
      });
    }

    if (r.projects?.length) {
      section("Projects");
      r.projects.forEach((p: any, i: number) => {
        doc.setFont("helvetica", "bold").setFontSize(11).text(p.name, 50, y); y += 14;
        doc.setFont("helvetica", "normal").setFontSize(10);
        if (p.tech) para(p.tech, 60);
        const bullets = r.project_bullets?.find((b: any) => b.index === i)?.bullets ?? [];
        for (const b of bullets) para(`• ${b}`, 60);
        if (p.description && bullets.length === 0) para(p.description, 60);
        y += 4;
      });
    }

    if (r.education?.length) {
      section("Education");
      r.education.forEach((e: any) => {
        doc.setFont("helvetica", "bold").setFontSize(11).text(`${e.degree} ${e.field ? "in " + e.field : ""}`, 50, y);
        y += 14;
        doc.setFont("helvetica", "normal").setFontSize(10).text(`${e.school} · ${e.start ?? ""}–${e.end ?? ""}`, 50, y);
        y += 16;
      });
    }

    doc.save(`${r.personal?.name ?? "resume"}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={onBack} className="rounded-xl bg-surface px-4 py-2 text-xs">← Edit</button>
        <button onClick={downloadPDF} className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-primary py-2 text-xs font-semibold text-primary-foreground">
          <Download className="h-3 w-3" /> Download PDF
        </button>
      </div>
      <div className="rounded-2xl bg-white p-6 text-slate-900">
        <h1 className="text-2xl font-bold">{r.personal?.name}</h1>
        {r.personal?.title && <p className="text-sm text-slate-600">{r.personal.title}</p>}
        <p className="mt-1 text-xs text-slate-500">
          {[r.personal?.email, r.personal?.phone, r.personal?.location, r.personal?.linkedin].filter(Boolean).join(" · ")}
        </p>
        {r.ai_summary && (<>
          <h2 className="mt-4 border-b border-slate-300 pb-1 text-sm font-bold">SUMMARY</h2>
          <p className="mt-1 text-xs">{r.ai_summary}</p>
        </>)}
        {r.skills_grouped?.length > 0 && (<>
          <h2 className="mt-4 border-b border-slate-300 pb-1 text-sm font-bold">SKILLS</h2>
          {r.skills_grouped.map((g: any, i: number) => (
            <p key={i} className="mt-1 text-xs"><span className="font-semibold">{g.label}: </span>{(g.items ?? []).join(", ")}</p>
          ))}
        </>)}
        {r.experience?.length > 0 && (<>
          <h2 className="mt-4 border-b border-slate-300 pb-1 text-sm font-bold">EXPERIENCE</h2>
          {r.experience.map((e: any, i: number) => (
            <div key={i} className="mt-2">
              <div className="flex justify-between text-xs"><span className="font-semibold">{e.role} — {e.company}</span><span>{e.start} – {e.end || "Present"}</span></div>
              <ul className="ml-4 list-disc text-xs">
                {(r.experience_bullets?.find((b: any) => b.index === i)?.bullets ?? []).map((b: string, j: number) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>)}
        {r.projects?.length > 0 && (<>
          <h2 className="mt-4 border-b border-slate-300 pb-1 text-sm font-bold">PROJECTS</h2>
          {r.projects.map((p: any, i: number) => (
            <div key={i} className="mt-2 text-xs">
              <p className="font-semibold">{p.name}</p>
              {p.tech && <p className="text-slate-600">{p.tech}</p>}
              <ul className="ml-4 list-disc">
                {(r.project_bullets?.find((b: any) => b.index === i)?.bullets ?? []).map((b: string, j: number) => <li key={j}>{b}</li>)}
              </ul>
            </div>
          ))}
        </>)}
        {r.education?.length > 0 && (<>
          <h2 className="mt-4 border-b border-slate-300 pb-1 text-sm font-bold">EDUCATION</h2>
          {r.education.map((e: any, i: number) => (
            <p key={i} className="mt-1 text-xs"><span className="font-semibold">{e.degree}{e.field ? " in " + e.field : ""}</span> · {e.school} · {e.start}–{e.end}</p>
          ))}
        </>)}
      </div>
    </div>
  );
}
