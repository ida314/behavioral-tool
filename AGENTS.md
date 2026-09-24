<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Behavioral Prep

A practice tool for entry-level SWE candidates: answer a behavioral question, save the
attempt, reflect, and review it later against earlier attempts at the same question.

## Read these before writing code

| Doc | What it settles |
| --- | --- |
| `docs/SPEC.md` | The product contract — pages, data model, API shapes, acceptance criteria |
| `docs/DECISIONS.md` | Choices the spec left open, and why (auth, ORM, no REST layer, …) |
| `docs/IMPLEMENTATION_PLAN.md` | **Start here.** What is already done, and the next phase to build |

The MVP loop is built and verified: practice → save → review → practice again, plus
stories, history, and progress. What remains is real authentication (the app still runs
on the `requireUser()` dev stub) and deployment — Phase 5 in the implementation plan.

## Rules specific to this codebase

**Authorization — the one that matters.** Every user-owned query is scoped to
`(await requireUser()).id` from `src/lib/auth.ts`. Use `findFirst({ where: { id, userId } })`,
never `findUnique({ where: { id } })`. Never take a user id from a request body, query
string, form field, or component prop. `Question` is the only unscoped table.

**Prisma 7 is not Prisma 5/6.** Import the client from `@/generated/prisma/client`, not
`@prisma/client`. It needs a driver adapter and the URL lives in `prisma.config.ts`. All
of this is handled in `src/lib/db.ts` — import `db` from there and never construct a
`PrismaClient` elsewhere. After editing `prisma/schema.prisma`, run `npm run db:migrate`.

**Next 16 is not Next 14/15.** `params` and `searchParams` are Promises — `await` them.
Page props come from generated global types (`PageProps<"/attempts/[attemptId]">`).

**Data access lives in `src/lib/queries/` (reads) and `src/lib/actions/` (writes)**, never
inline in a component. This is what keeps a REST layer cheap to add later (ADR-005).

**Never lose a user's answer.** A failed save must leave the response in the textarea
(SPEC §24). Losing a multi-paragraph interview answer is the worst bug this app can have.

**Question ids are stable and hand-assigned** (`q_conflict_01`). Never renumber or reuse
one — attempts reference them (ADR-004).

## Commands

```bash
npm run dev          # Next dev server
npm run db:up        # Postgres 17 in Docker on localhost:5433
npm run db:migrate   # prisma migrate dev
npm run db:seed      # 23 questions + dev user (idempotent)
npm run db:studio    # browse the data
npm run whisper:setup # build whisper.cpp + fetch a model (once, for spoken answers)
npm run typecheck    # tsc --noEmit
npm run lint
```

Run `npm run typecheck` and `npm run lint` before calling a phase done.

## Scope discipline

No AI scoring or resume parsing — see SPEC §3 and §34. The MVP exists to answer one
question: does a persistent history of answers make practice better?

**Audio is now in scope** and is the one deliberate exception to SPEC §3 (see ADR-010).
An attempt can be spoken: recorded in the browser, transcribed by a local whisper.cpp,
saved as audio bytes in `AttemptAudio` plus editable text on the attempt. Run
`npm run whisper:setup` once before using it. Everything downstream — history, progress,
previous-attempt comparison — reads the text field and needs no knowledge of audio.

**Spaced review** (ADR-011) orders the practice page from a self-rating on each attempt.
It has no table of its own: `src/lib/review.ts` recomputes each question's schedule from
its attempts on every read. Keep it that way — a stored schedule can disagree with history.
