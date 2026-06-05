
# Proof-Based Verification + Reward Economy

Big feature set. Shipping in 3 phases so each phase is usable on its own. All UI stays in the existing vertical Flow style (FlowNode + animated arrows) and the dark Midnight Indigo palette — we're adding nodes and screens, not redesigning.

## Phase 1 — Verification engine + Bond Credits (core)

The blocker. Without this, nothing else matters.

### Data model (one migration)
- `check_ins`: add `status` (`pending` | `verified` | `rejected`), `submission jsonb` (per-habit proof fields), `verification jsonb` (questions + answers + score), `verified_at`
- `bond_credits_ledger(id, user_id, delta, reason, check_in_id?, created_at)` — append-only; balance = SUM(delta)
- `user_stats(user_id, total_credits, xp, level, verifications_passed, verifications_failed)` — kept in sync by a trigger on the ledger
- `daily_missions(id, user_id, date, kind, target, progress, completed)` + `weekly_missions` (same shape, week start date)
- `rewards(id, slug, name, description, cost_credits, kind)` — seeded with "AI Resume Builder" (1000)
- `reward_redemptions(id, user_id, reward_id, redeemed_at, payload jsonb)`
- Rewrite `perform_check_in` RPC: only **creates** a pending check-in + returns a question set; **does NOT** touch streaks/credits
- New `complete_verification(check_in_id, answers[])` RPC: scores answers, if ≥ 3/5 → mark verified, update streak, award credits (10 base + milestone bonuses 50@7d / 200@30d / 500@100d), insert ledger row, fan out group notification (existing milestone logic)
- All tables: RLS scoped to `auth.uid()` + GRANTs (authenticated + service_role)

### Server functions (`createServerFn`)
- `startCheckIn({ habit_id, submission })` → returns `{ check_in_id, questions: [{id, prompt, choices}] }`
- `submitVerification({ check_in_id, answers })` → returns `{ status, score, creditsAwarded, newStreak, milestone, message }`
- `getMyEconomy()` → balance, level, xp, today's earnings, recent ledger, pending verifications count, verification success rate
- `listMissions()`, `getRewards()`, `redeemReward({ reward_id, payload })`

### Question generation
Use Lovable AI Gateway (`google/gemini-2.5-flash`, JSON response) inside `startCheckIn`. Prompt is per-category and seeded with the user's submission:
- **Reading**: book/article + pages/minutes → comprehension questions on the topic
- **Coding**: repo URL + snippet → questions on what the code does, language, patterns
- **Running**: distance + duration + screenshot URL → pace, route, perceived effort questions
- **Gym**: exercises list + photo → form/sets/reps questions
- **Meditation**: minutes + type → reflection questions ("what arose", "anchor used")

Each question is multiple choice (4 options, 1 correct) for deterministic scoring. AI returns `{questions:[{prompt, choices, correctIndex}]}`. We store `correctIndex` server-side only and never ship it to the client.

### UI (frontend-only, Flow-style)
- **Home check-in flow** — clicking "Check in" no longer instantly completes. New nodes animate in:
  1. Submission form node (fields depend on habit category)
  2. "Generating questions…" node (pulse)
  3. 5 question nodes, one at a time (MC, tap to answer)
  4. Result node: ✅ Verified (+credits, streak, milestone) OR ❌ Rejected (score, retry tomorrow)
- **Persistent top bar in AppShell**: Bond Credits counter (animated count-up) + XP bar + level chip
- **`/economy` route**: Flow of [Balance node] → [Today's earnings] → [Ledger nodes (last 20)] → [Success rate]
- **`/missions` route**: Daily + weekly missions as FlowNodes with progress bars
- **Pending verifications** node on Home if any check-ins are stuck in `pending`

## Phase 2 — Rewards Marketplace + AI Resume Builder

- `/rewards` route: Flow of reward nodes, each with cost + [Redeem] (disabled until balance ≥ cost)
- Redeeming "AI Resume Builder" unlocks `/rewards/resume`:
  - Flow form: Name → Education → Skills → Projects → Experience (one node per step)
  - On submit, Lovable AI generates ATS-friendly resume content (JSON → React template)
  - "Download PDF" via client-side `react-to-print` / `jspdf` (no native deps)
  - 3 template variants (Minimal, Modern, Classic) — picked as a FlowNode choice
- Redemption deducts credits via ledger row (`delta = -1000`) inside a single RPC

## Phase 3 — Gamification polish + anti-cheat hardening

- XP system: every verified check-in = 25 XP, milestone bonuses; level thresholds (0/100/250/500/1000 credits earned all-time, then +1000 per level)
- Achievement unlock screen: full-screen FlowNode burst with confetti (CSS keyframes, no new deps) on level-up / milestone / reward unlock
- Verification accuracy score on profile
- Anti-cheat:
  - Unique constraint `(habit_id, user_id, check_in_date)` already exists — blocks duplicates
  - Pending check-ins expire after 30 min (cron-free: checked lazily on next `startCheckIn`)
  - Rate limit: max 1 in-flight pending check-in per habit
  - Question `correctIndex` never leaves the server
  - Submission hashes (repo URL, photo URL) stored to flag re-use

## Technical notes
- All new server logic in `src/lib/verification.functions.ts`, `economy.functions.ts`, `rewards.functions.ts` — protected by `requireSupabaseAuth`
- AI calls use `LOVABLE_API_KEY` (already in secrets), `google/gemini-2.5-flash` with `response_format: json_object`
- Photo/screenshot uploads → new `proofs` private bucket, signed URLs
- Realtime: subscribe `bond_credits_ledger` to live-update the top-bar counter
- No new heavy deps; PDF generation via `jspdf` (Worker-safe, pure JS)

## Out of scope for this rollout
- Human moderation of verifications
- Image-content verification (we trust the photo exists; AI questions test recall, not authenticity)
- Marketplace beyond the Resume Builder reward (one reward seeded; framework supports more)

---

**Recommendation: ship Phase 1 first** (verification + credits + the new check-in flow + top bar). That alone delivers the core "earn streaks, don't self-report" value. Reply with **"go phase 1"** to start, or tell me to adjust scope.
