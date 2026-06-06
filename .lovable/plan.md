
# MomentumOS — Full Build Plan

Built on the existing stack (TanStack Start + React 19 + Lovable Cloud / Supabase + Lovable AI Gateway). Next.js isn't applicable; everything below uses the in-place architecture and extends Phase 1 (already shipped: pending/verified check-ins, AI quizzes, bond credits, rewards table, milestone groups).

## What ships in this round

### 1. Per-Category Bond Credits + Shield Marketplace
- Migrate `bond_credits_ledger` and `user_stats` from a single balance to **per-category balances** (coding, reading, gym, running, meditation, fasting, custom).
- New table `shields` (kind: bronze/silver/gold, category, cost, missed_days_protected, validity_days). Seed 3 shields × 6 categories = 18 SKUs.
- New table `user_shields` (status: active/used/expired, category, expires_at, used_on_date).
- New RPC `purchase_shield(category, kind)` — atomic ledger debit + inventory insert, only spendable from matching category balance.
- New RPC `use_shield(habit_id, missed_date)` — preserves streak, marks shield used.
- Daily edge logic: when a user opens the app and missed yesterday for a habit with an active shield, prompt "Use Shield to save your streak?" (frontend modal).
- Route `/shields` — per-category storefront tabs + inventory ("Active / Used / Expired").

### 2. Clubs: Realtime Chat + Feed + Leaderboards
- Repurpose existing `groups` + `group_memberships` + `group_messages` as **Clubs** (one per category, unlocked at 7-day verified streak in that category — already auto-joined by `complete_verification`).
- Enable Supabase Realtime on `group_messages`.
- New columns on `group_messages`: `reply_to_id`, `reactions jsonb`, `pinned bool`.
- New table `message_reactions` (message_id, user_id, emoji).
- New table `club_feed_items` (kind: check_in/milestone/badge/champion/new_member, payload, club_id, user_id) — fanout via trigger on `complete_verification`.
- New table `weekly_champions` (club_id, week_start, user_id, metric, value, badge).
- Scheduled SQL job (pg_cron) to compute champions every Monday + award champion badge + 200 bonus credits in club's category.
- Route `/clubs/$slug` — chat tab, feed tab, leaderboard tab, members tab. Discord-style sidebar listing user's unlocked clubs.

### 3. Expanded AI Verification (all 6 categories + custom)
- Rich submission forms per category in `CheckInModal`:
  - **Coding**: GitHub URL + screenshot upload + project description
  - **Reading**: topic + pages + summary (≥50 chars)
  - **Gym**: exercises (sets/reps) + duration + optional photo
  - **Running**: distance + duration + screenshot upload
  - **Meditation**: duration + reflection notes
  - **Fasting**: start/end time + notes
  - **Custom**: free-form proof
- Create private storage bucket `proof-uploads` with RLS (owner-only); upload before quiz generation.
- Update `generateQuestions` prompt builder to use richer submission shape; add `confidence_score` (0–1) from AI based on submission completeness.
- Verification pass threshold raised to **3/5 (60%)** + bonus +5 credits if score ≥ 90% (4.5/5).

### 4. Gamification + Daily Engagement
- New table `daily_missions` (date, kind, target, reward_credits, reward_xp) — seed 3/day via cron.
- New table `user_mission_progress` (user_id, mission_id, progress, completed_at).
- New table `achievements` (slug, name, description, icon, criteria jsonb) + `user_achievements` (unlocked_at). Seed: 7/30/100/365-day streaks, "First Shield", "Club Champion", "Verification 90+", "Five-Category Athlete".
- New table `daily_reward_box` (user_id, claim_date, reward jsonb) — once per UTC day, random tiered reward.
- Compute `consistency_score` (0–100) in a view from streaks + verification accuracy + activity + challenge participation.
- GitHub-style contribution heatmap component (52w × 7d) reading from `check_ins`.
- Achievement unlock modal with confetti + sound-free CSS animation.
- Route `/missions` — today's missions + weekly missions + claim button.
- Route `/feed` — global social feed (verified check-ins, milestones, achievements) with like/comment via new `feed_likes` + `feed_comments` tables.

### 5. AI Resume Builder (reward unlock)
- Triggered by redeeming "AI Resume Builder" reward (already seeded at 1000 credits, but switch cost to be spendable from any-category lifetime credits).
- Route `/rewards/resume` — multi-step form (Personal → Education → Skills → Projects → Experience → Summary).
- Server fn `generateResume` calls Lovable AI Gateway (`google/gemini-2.5-pro`) with strict JSON schema → returns ATS-friendly structured resume.
- Three template variants (Modern / Classic / Minimal) rendered in React.
- PDF export via `jspdf` + `jspdf-autotable` (Worker-safe pure JS).
- New table `user_resumes` (user_id, payload jsonb, template, created_at).

## What's deferred (acknowledged but not in this round)

- **Admin panel** (user management, moderation, analytics) — needs separate auth role design; ship after.
- **Public landing page redesign** — current `/` is functional; full marketing site is its own scope.
- **Referral rewards system** — needs invite code infra; ship after core economy is stable.
- **LinkedIn Optimizer / Portfolio Generator / additional career rewards** — Resume Builder is the template; others follow same pattern in a later round.
- **Legal pages** (Terms, Privacy, etc.) — placeholder routes only; real copy needs legal review.
- **SAML SSO & email password reset page** — sign-up/sign-in already works (Google + email/password); reset flow is a small follow-up.
- **Mentions / pinned message UI polish in chat** — schema supports it, basic UI ships, advanced UX follows.

## Technical notes (for review)

- **Single big migration** with all new tables, columns, RPCs, triggers, RLS policies, GRANTs, and seed data. Order: extend `user_stats` & `bond_credits_ledger` with `category` column → rewrite `complete_verification` to credit the habit's category → create shields/clubs/missions/achievements/feed → seed shields & achievements & rewards.
- **`complete_verification` rewrite**: credits routed to per-category buckets; bonus +5 if score==total; XP and `lifetime_credits` remain global (used for level + Resume Builder redemption).
- **Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages, public.club_feed_items, public.notifications;`
- **Storage**: private `proof-uploads` bucket; users can only read/write `${auth.uid()}/...` paths.
- **Cron**: pg_cron job at Monday 00:05 UTC for weekly champions; daily 00:05 UTC for daily missions seeding + shield expiry sweep.
- **Files added** (~25): migration, ~6 new routes, ~10 new components (ShieldCard, ClubChat, ClubFeed, Leaderboard, Heatmap, MissionCard, AchievementToast, ResumeForm, ResumePreview, DailyRewardBox), ~5 server-function files, updated `CheckInModal`, updated `AppShell` (per-category credit chips + club sidebar).
- **No breaking change to existing routes**; `/home`, `/economy`, `/rewards`, `/groups/*` continue working and gain new data.

## After approval, I'll execute in this order

1. Migration (schema + RPCs + seed + RLS + GRANTs + realtime + cron + storage bucket)
2. Per-category economy UI (`AppShell` chips, `/economy` tabs, `/shields` storefront + inventory)
3. Expanded check-in flow (forms + storage upload + updated quiz prompts)
4. Clubs (realtime chat + feed + leaderboard, sidebar)
5. Gamification (missions, achievements, heatmap, daily reward box, feed)
6. AI Resume Builder
7. Verify with `browser--view_preview` + targeted log checks

Reply **"go"** to execute, or tell me to drop/swap pieces first.
