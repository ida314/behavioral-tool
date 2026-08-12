# Implementation Plan

Read [SPEC.md](./SPEC.md) for *what* to build and [DECISIONS.md](./DECISIONS.md) for
resolved architecture choices. This file is the *order of work*.

Phases follow SPEC §30 and are **vertical slices** — each one ends with something a user
can actually do. Do not build all the models first, and do not start a phase before the
previous phase's acceptance check passes.

---

## Status

### Done (foundation — verified working)

| Item | Where |
| --- | --- |
| Next 16 + TS + Tailwind v4 scaffold | `src/app/` |
| Postgres 17 in Docker, host port 5433 | `docker-compose.yml` |
| Prisma 7 schema — all four models, enum, indexes, delete rules | `prisma/schema.prisma` |
| Initial migration, applied | `prisma/migrations/` |
| Prisma client singleton with pg driver adapter | `src/lib/db.ts` |
| Dev-stub `requireUser()` | `src/lib/auth.ts` (see ADR-003) |
| Competency vocabulary + display labels | `src/lib/competency.ts` |
| 53-question bank, exact SPEC §9 distribution | `src/data/questions.ts` |
| Idempotent seed | `prisma/seed.ts`, `npm run db:seed` |

Verified: migration applies, seed produces 53 questions in the specified distribution,
and a PracticeAttempt can be created, read back with its relations, and deleted through
`src/lib/db.ts` + `requireUser()`. `npm run typecheck` is clean.

### Not started

Everything user-facing. `src/app/page.tsx` is still the create-next-app placeholder.

---

## First 20 minutes in this repo

```bash
npm install                 # also runs prisma generate via postinstall
cp .env.example .env        # if .env is missing
npm run db:up               # Postgres on localhost:5433
npm run db:migrate          # apply migrations
npm run db:seed             # 53 questions + dev user
npm run dev
```

Sanity check before writing code: `npm run db:studio` should show 53 rows in `Question`.

---

## Conventions

These keep the phases below cheap to build and keep ADR-005 reversible.

**Data access lives in modules, never inline in components.**

```
src/lib/queries/   reads    — questions.ts, attempts.ts, stories.ts, progress.ts
src/lib/actions/   writes   — attempts.ts, stories.ts   ("use server")
```

**Every user-owned query is scoped.** This is SPEC §20 and it is not negotiable:

```ts
const user = await requireUser();
const attempt = await db.practiceAttempt.findFirst({
  where: { id: attemptId, userId: user.id },   // findFirst + userId, never findUnique
});
```

`Question` is the only table that is *not* user-scoped — it is system-owned.

**Server Components by default.** Add `"use client"` only for the practice editor,
the timer, and form widgets that need local state.

**Revalidate after writes.** Server actions call `revalidatePath()` for the paths whose
data they changed (`/`, `/history`, `/progress`, the attempt page).

**Instrument as you go.** Fire the SPEC §25 event at each call site while building the
flow — see ADR-008.

---

## Phase 1 — Practice and save

The whole point: at the end of this phase an answer can be written and stored.

**Build**

1. `src/lib/analytics.ts` — `track(event, props)`, dev-only console logging.
2. `src/lib/validation.ts` — Zod schemas: `createAttemptSchema`
   (`questionId` required, `response` 1–20,000 chars, optional `storyId`,
   `durationSeconds`, `reflection`), `createStorySchema` (`title` 1–100,
   `description` ≤ 2000).
3. `src/lib/queries/questions.ts` — `listQuestions(competency?)`,
   `getQuestion(id)`, `randomQuestion(competency?)`,
   `questionPracticeStats(userId, questionId)` → `{ attemptCount, lastPracticedAt }`.
4. `src/lib/actions/attempts.ts` — `createAttempt(input)`. Scoped to
   `requireUser()`, validated, returns the new id.
5. `src/components/CompetencyBadge.tsx`, `src/components/QuestionCard.tsx`.
6. `src/app/practice/page.tsx` — competency filter + random question + question list
   (SPEC §8.2). Filter state via `searchParams` (remember: `await props.searchParams`).
7. `src/app/practice/[questionId]/page.tsx` — server component that loads the question
   and renders the client editor.
8. `src/components/PracticeEditor.tsx` (`"use client"`) — textarea, `PracticeTimer`,
   **Finish Practice** → save panel (story picker stubbed out until Phase 3, reflection
   textarea) → **Save Attempt** → redirect to the attempt detail page.
   The response stays in client state until the save succeeds (SPEC §24).
9. `src/components/PracticeTimer.tsx` (`"use client"`) — SPEC §18. Records duration;
   never blocks submission.
10. Replace `src/app/page.tsx` with a real dashboard shell and a
    **Practice a Question** CTA. Full stats come in Phase 4.
11. A minimal app shell in `src/app/layout.tsx`: nav to Practice / History / Stories /
    Progress, and a real `<title>`.

**Acceptance:** open `/practice`, filter by Conflict, pick a question, type an answer,
click Finish then Save — the row exists in `PracticeAttempt` with the right `userId`,
`questionId`, and a plausible `durationSeconds`.

---

## Phase 2 — History and review

This is the phase that makes the product worth using (SPEC §8.6).

**Build**

1. `src/lib/queries/attempts.ts` — `listAttempts(userId, { competency? })` with question
   and story included, `createdAt DESC`; `getAttemptDetail(userId, attemptId)` returning
   the attempt, its question, its story, **and all other attempts for the same
   questionId** ordered oldest-first so they can be numbered "Attempt #1, #2, …".
2. `src/components/AttemptCard.tsx` — date, question, competency, story, duration.
3. `src/app/history/page.tsx` — list + competency filter (only competency filtering is
   required; SPEC §8.5).
4. `src/app/attempts/[attemptId]/page.tsx` — full detail per SPEC §8.6, including the
   previous-attempts list and a "Practice this question again" link to
   `/practice/[questionId]`.
5. A duration formatter (`2m 14s`) and a date formatter, in `src/lib/format.ts`.

**Acceptance:** answer the *same* question twice, then open the newer attempt and see the
older one listed with the correct attempt number and date.

---

## Phase 3 — Stories

**Build**

1. `src/lib/queries/stories.ts` — `listStories(userId)` including
   `_count.attempts`; `getStoryWithAttempts(userId, storyId)`.
2. `src/lib/actions/stories.ts` — `createStory`, `updateStory`, `deleteStory`.
   Deleting must null out `storyId` on attempts, never delete them — the schema's
   `onDelete: SetNull` already enforces this, so just don't work around it (SPEC §16).
3. `src/components/StoryForm.tsx`, `src/components/StorySelector.tsx`
   (select existing **or** create inline, per SPEC §8.4).
4. `src/app/stories/page.tsx` — list with "Used in N practice attempts".
5. Wire `StorySelector` into the Phase 1 save panel, replacing the stub.

**Acceptance:** create a story from inside the save flow, see it attached to the attempt
in History, and see "Used in 1 practice attempt" on `/stories`. Delete the story — the
attempt survives with no story.

---

## Phase 4 — Progress and dashboard

**Build**

1. `src/lib/queries/progress.ts` — `getProgress(userId)` returning the SPEC §17 shape:
   `totalAttempts`, `questionsPracticed`, and per-competency `attemptCount` +
   `uniqueQuestions`. Computed from `PracticeAttempt` — **no analytics table**.
   Include competencies with zero attempts; the neglected ones are the point (SPEC §8.8).
2. `src/components/ProgressRow.tsx`.
3. `src/app/progress/page.tsx` — SPEC §8.8, sorted by count descending.
4. Fill in the real dashboard numbers on `/` (SPEC §8.1): total attempts, questions
   practiced, competencies covered `N / 10`, most recent attempt. Keep it simple.

**Acceptance:** the numbers on `/progress` and `/` match what is in the database, and
untouched competencies show `0`.

---

## Phase 5 — Polish and real auth

**Build**

1. `src/components/EmptyState.tsx` and the three empty states in SPEC §23.
2. Loading UI (`loading.tsx`) for history, progress, and attempt detail.
3. Error handling per SPEC §24 — a save failure shows "Something went wrong while
   saving your response." with **Try Again**, and **must not clear the textarea**.
   Test this deliberately by stopping the database mid-save.
4. Responsive layout pass; check the practice editor on a phone-width viewport.
5. Point `track()` at a real analytics provider.
6. **Replace the dev-stub auth** (ADR-003) with a managed provider. Scope of the change:
   `src/lib/auth.ts` returns the real session user, plus sign-in/sign-out UI and
   middleware. If every query was written scoped, nothing else moves.
7. Deploy: Vercel + a hosted Postgres. Swap the driver adapter in `src/lib/db.ts` if the
   host requires it, set `DATABASE_URL`, and run `prisma migrate deploy` on release.

**Acceptance:** SPEC §29, all fourteen steps, performed by a newly registered account.

---

## Deliberately out of scope

Everything in SPEC §3, plus the `/api/*` REST layer (ADR-005) and `AttemptEvaluation`
(SPEC §11 — anticipated by the schema's shape, not implemented). Do not let AI features
delay this loop: **practice → save → review → practice again** (SPEC §34).
