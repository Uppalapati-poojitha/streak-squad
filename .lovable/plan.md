
# ConsistencyOS — Plan

A dark, mobile-first habit-streak app where **the entire UI is built as a vertical flow diagram**: every screen visualizes actions cascading down through nodes connected by arrows, just like the reference flow:

```text
Venu checks in at gym
        │
        ▼
Streak becomes 24 days
        │
        ▼
Achievement detected
        │
        ▼
Notification sent to group
        │
        ▼
🔥 Venu completed Day 24 of his gym streak!
```

## Core visual system (the "Flow" component)

A reusable `<Flow>` primitive renders a vertical stack of `<FlowNode>` cards connected by animated SVG arrow segments. Each node has:
- icon chip (left), title, optional subtitle/metric, optional action button
- state: `pending` (dimmed), `active` (mint glow + pulse), `done` (solid indigo)
- arrow below: draws in with `pathLength` animation when the next node activates

Every major screen is composed of Flow nodes — not traditional cards/lists.

## Palette
Midnight Indigo: bg `#0a0a1a`, surface `#141432`, indigo `#4f46e5`, mint accent `#2dd4a8`, fire orange `#ff6b35` for streak/achievement nodes.

## Screens (all as flows)

### Landing `/`
The hero IS the reference flow above, animated on loop. Below: a second flow showing "Sign up → Pick a habit → Check in daily → Join the club".

### Home `/_authenticated/home`
Today's flow for the user:
```text
[Today, Friday]
   │
   ▼
[Gym]  Day 23 streak  → [ Check in ] button
   │
   ▼
[Reading]  Day 7 streak  → [ Check in ] button
   │
   ▼
[Your next milestone: Day 30 — 7 days to go]
```
Tapping Check in flips that node to `done`, the arrow below extends, and new nodes animate in: "Streak → Day 24" → "Achievement detected" → "Notification sent to 30-Day Club" → message card. Exact mirror of the reference flow, played live.

### Habit detail `/_authenticated/habits/$id`
Flow: habit header → contribution-grid node (GitHub-style 90 days) → current-streak node → recent check-ins sub-flow → next milestone node.

### Challenges `/_authenticated/challenges`
Flow of joinable public habits, each a node with [Join] action.

### Groups list `/_authenticated/groups`
Flow of clubs the user belongs to, each node showing member count + latest activity.

### Group page `/_authenticated/groups/$slug`
Flow feed: every message (system or member) is a node connected by arrows in chronological order. Composer at bottom adds a new node.

### Inbox `/_authenticated/inbox`
Flow of notifications top-to-bottom; tapping jumps to the matching node in the source group.

### Profile `/_authenticated/profile/$username`
Flow: avatar+stats → habits → badges → clubs joined.

### Auth `/auth`
Single-column flow: "Welcome → Sign in → Pick first habit".

## Features (rendered as flows)

1. **Auth** — Google (via Lovable broker) + email/password
2. **Habits** — create with category (Gym/Run/Code/Read/Meditate/Fast/Custom), target_days, public/private
3. **Daily check-in** — one-click, optional photo proof, triggers the animated flow
4. **Streaks** — current + longest, contribution grid
5. **Leaderboard** — weekly/monthly tabs (ranked flow)
6. **Badges** — auto-awarded at 7/30/100/365
7. **Achievement-triggered groups** — milestone clubs auto-join + system message + fan-out notifications, atomic in one Postgres function
8. **In-app notifications** — bell with unread count, realtime via Supabase

## Technical details

**Stack**: TanStack Start v1, React 19, Tailwind v4, Lovable Cloud, Motion (framer-motion) for node/arrow animations, Supabase Realtime for messages + notifications.

**`<Flow>` component**: `src/components/flow/Flow.tsx`, `FlowNode.tsx`, `FlowArrow.tsx` (SVG with `motion.path` `pathLength` 0→1). Used on every screen.

**Tables** (RLS + GRANTs to `authenticated`, `service_role`):
- `profiles(id, username, display_name, avatar_url)`
- `habits(id, owner_id, title, category, target_days, is_public, created_at)`
- `habit_members(habit_id, user_id, joined_at)`
- `check_ins(id, habit_id, user_id, check_in_date, photo_url, created_at)` UNIQUE(habit_id, user_id, check_in_date)
- `streaks(user_id, habit_id, current_streak, longest_streak, last_check_in)`
- `badges(id, user_id, kind, habit_id, awarded_at)`
- `groups(id, slug, name, kind, threshold)` — seeded 7/30/100/365 clubs
- `group_memberships(group_id, user_id, joined_at)`
- `group_messages(id, group_id, author_id NULL=system, kind, body, payload jsonb, created_at)`
- `notifications(id, user_id, kind, payload jsonb, read_at, created_at)`

**Server logic**: `createServerFn` for all writes. The check-in serverFn calls one `SECURITY DEFINER` Postgres function that atomically: recomputes streak → detects milestone → joins group → inserts system message → fans out notifications → returns `{ newStreak, milestoneCrossed, groupSlug, messageBody }` so the client plays the flow animation with real data.

**Storage**: `proofs` (private, signed URLs), `avatars` (public).

**Routes**: `/`, `/auth`, `/_authenticated/{home, habits/$id, challenges, leaderboard, groups, groups/$slug, inbox, profile/$username}`.

## Out of scope (v1)
Email/push delivery, global social feed, AI features, workout planning.
