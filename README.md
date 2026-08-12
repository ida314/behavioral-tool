# Behavioral Prep

A lightweight practice tool for entry-level software engineering candidates preparing for
behavioral interviews.

```
Choose question → Answer → Save → Reflect → Review
```

The bet: keeping a persistent, structured history of your answers — and being able to see
your earlier attempts at the same question — makes practice meaningfully better than
answering isolated questions.

## Status

Foundation is in place and verified: database schema, migration, a 53-question seeded
bank, and the db/auth libraries. The user-facing app has not been built yet — see
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md).

## Getting started

Requires Node 22+ and Docker.

```bash
npm install              # runs prisma generate automatically
cp .env.example .env
npm run db:up            # Postgres 17 on localhost:5433
npm run db:migrate
npm run db:seed          # 53 questions + a dev user
npm run dev
```

Open http://localhost:3000. Browse the data with `npm run db:studio`.

> Authentication is currently a dev stub — every request is attributed to one local user.
> See [ADR-003](docs/DECISIONS.md#adr-003--dev-stub-authentication-now-managed-provider-in-phase-5).
> Do not deploy publicly before Phase 5 replaces it.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · PostgreSQL 17 · Prisma 7 · Zod

## Documentation

- [`docs/SPEC.md`](docs/SPEC.md) — the product contract
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — architecture choices and their rationale
- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) — phased build order
- [`AGENTS.md`](AGENTS.md) — conventions for anyone (human or agent) writing code here

## Layout

```
src/
  app/            routes (dashboard, practice, history, attempts, stories, progress)
  components/     small, purpose-built UI pieces
  lib/            db.ts · auth.ts · competency.ts · queries/ · actions/
  data/           questions.ts — the curated question bank
prisma/           schema.prisma · seed.ts · migrations/
docs/             spec, decisions, implementation plan
```
