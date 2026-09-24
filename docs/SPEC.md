# Technical Specification: Behavioral Interview Practice MVP

> This is the product contract, reproduced from the original spec. It is the source
> of truth for **what** to build. Where implementation had to resolve something the
> spec left open, the resolution lives in [DECISIONS.md](./DECISIONS.md) — that file
> never contradicts this one without saying so explicitly.

## 1. Overview

**Working name:** Behavioral Prep

Behavioral Prep is a lightweight web application for entry-level software engineering
candidates to practice behavioral interview questions, record written responses,
associate responses with personal stories, and review previous attempts over time.

The MVP focuses on one core loop:

```
Choose question → Answer → Save → Reflect → Review
```

The application should create a structured history of behavioral interview practice
that can later support AI scoring, voice transcription, adaptive questioning, and
personalized coaching.

## 2. Goals

The MVP should allow a user to:

1. Browse behavioral interview questions.
2. Filter questions by competency.
3. Practice answering a selected question.
4. Save their response as a practice attempt.
5. Optionally associate the attempt with a reusable story.
6. Add a short reflection after practicing.
7. Review previous attempts.
8. View basic practice coverage across competencies.
9. View previous attempts for the same question.

The system should preserve enough structured data to support future AI features
without requiring major schema changes.

## 3. Non-Goals

The MVP will **not** include: AI-generated scoring · AI-generated feedback · resume
parsing · audio recording · speech transcription · AI interviewer follow-up questions
· company-specific preparation · STAR answer generation · automatic story extraction
· interview scheduling · social features · gamification · mobile native apps ·
large-scale question generation.

These can be added after validating that users consistently practice and review
their responses.

## 4. Target User

> Entry-level software engineering candidate preparing for behavioral interviews.

Typical users may have experiences from internships, class projects, hackathons,
research, clubs, personal projects, part-time jobs, or volunteer work. **The product
must not assume extensive professional experience.**

## 5. Core Concepts

Four domain objects:

- **User** — the candidate using the application.
- **Question** — a curated behavioral interview question.
  _"Tell me about a time you disagreed with a teammate."_
- **Story** — a reusable personal experience usable across multiple questions.
  _"Distributed Systems Group Project"_
- **Practice Attempt** — a specific response to a question. **This is the central
  object.** A user may answer the same question many times, producing multiple
  attempts.

## 6. Core User Flow

### Flow 1: Start Practice

User opens the Practice page and may receive a random question, select a competency,
or choose a specific question.

Metadata displayed: competency, previous attempt count, last practiced date.
Primary action: **Practice Question**.

### Flow 2: Answer Question

The user sees the question, its competency, a text input area, and an optional timer.
Primary action: **Finish Practice**.

### Flow 3: Save Attempt

After finishing, the user may enter:

- **Story used** — select an existing story or create a new one.
- **Reflection** — optional short response, e.g. _"I spent too long explaining the
  architecture and not enough time explaining what I personally did."_

Action **Save Attempt** creates a PracticeAttempt.

### Flow 4: Review Practice History

Previous attempts sorted newest first, showing date, question, competency, and story.
Clicking an attempt opens the full response.

## 7. MVP Pages

```
/
/practice
/history
/attempts/:attemptId
/stories
/progress
```

Authentication routes may additionally exist depending on the auth provider.

## 8. Page Specifications

### 8.1 Dashboard — `/`

Provide a simple starting point. Display: total practice attempts, questions
practiced, competencies practiced, most recent attempt, and the primary CTA
**Practice a Question**.

```
Behavioral Prep

You have completed 18 practice attempts.

Questions Practiced      12
Competencies Covered     6 / 10
Most Recent              Conflict — August 8

[ Practice a Question ]
```

**Avoid turning the dashboard into a complex analytics page.**

### 8.2 Practice Page — `/practice`

Question selection: `Random Question`, or filter by competency.

Competencies: Teamwork · Conflict · Leadership · Failure · Ambiguity ·
Communication · Technical Challenge · Learning · Time Management · Feedback

Question card displays:

```
Conflict

Tell me about a time you disagreed with a teammate.

Previously practiced: 2 times

[ Practice Question ]   [ Another Question ]
```

### 8.3 Practice Session — `/practice/:questionId`

May also be implemented as state within `/practice`.

```
Conflict

Tell me about a time you disagreed with a teammate.

[ response textarea ]

Timer: 01:42

[ Finish Practice ]
```

**Required:** response text. **Optional:** timer. The timer records duration but must
never prevent submission.

### 8.4 Save Attempt Screen

```
Your Response
"During my distributed systems project..."

Story Used
[ Select story ]  or  [ + Create New Story ]

Reflection
[ textarea ]

[ Save Attempt ]
```

Story and reflection are optional.

### 8.5 History — `/history`

Attempts sorted by `createdAt DESC`. Each item shows date, question, competency,
story, and duration if available.

```
August 8

Tell me about a disagreement with a teammate.

Conflict
Distributed Systems Project
2m 14s
```

Filters: competency, question, story. **Only competency filtering is required for
the initial MVP.**

### 8.6 Attempt Detail — `/attempts/:attemptId`

```
Tell me about a time you disagreed with a teammate.
Conflict

Attempt #3
August 8, 2026
Duration: 2m 14s

Response
During my distributed systems project...

Story
Distributed Systems Project

Reflection
I spent too long explaining the architecture.

Previous Attempts
Attempt #2 — July 29
Attempt #1 — July 14
```

Previous attempts are those where `questionId === currentAttempt.questionId`.

**This is one of the most important MVP features** because it lets users observe
improvement.

### 8.7 Stories — `/stories`

Users create lightweight story records with a **Title** and **Description**.

```
Distributed Systems Project

Worked with three classmates to build a fault-tolerant key-value store.

Used in 5 practice attempts
```

Clicking a story may show associated attempts. Advanced story analysis is out of scope.

### 8.8 Progress — `/progress`

Intentionally simple: practice attempts grouped by competency.

```
Teamwork             8
Technical Challenge  6
Conflict             4
Leadership           3
Failure              2
Feedback             1
Ambiguity            0
```

Answers: _"What have I practiced?"_ and _"What am I neglecting?"_ No complex scoring.

## 9. Question Bank

A curated **static** database of ~40–60 questions. **Do not generate questions
dynamically.** Each question belongs to one primary competency.

```json
{
  "id": "question_001",
  "text": "Tell me about a time you disagreed with a teammate.",
  "competency": "CONFLICT"
}
```

Distribution (23 total, revised 2026-09-24 — the bank in `src/data/questions.ts` is
authoritative): Motivation & Fit 5 · Technical Challenge 5 · Learning 2 ·
Time Management 2 · Ambiguity 2 · Teamwork 2 · Conflict 1 · Communication 1 ·
Failure 1 · Feedback 1 · Leadership 1

## 10. Data Model

```typescript
type User = {
  id: string
  email: string
  name?: string
  createdAt: Date
  updatedAt: Date
}

type Question = {
  id: string
  text: string
  competency: Competency
  createdAt: Date
}

enum Competency {
  TEAMWORK, CONFLICT, LEADERSHIP, FAILURE, AMBIGUITY,
  COMMUNICATION, TECHNICAL_CHALLENGE, LEARNING, TIME_MANAGEMENT, FEEDBACK, MOTIVATION
}

type Story = {
  id: string
  userId: string
  title: string
  description?: string
  createdAt: Date
  updatedAt: Date
}

type PracticeAttempt = {
  id: string
  userId: string
  questionId: string
  storyId?: string
  response: string
  durationSeconds?: number
  reflection?: string
  createdAt: Date
  updatedAt: Date
}
```

Questions are **system-owned** — users do not create or edit them in the MVP.
Prefer an enum for Competency over a separate table.

```
User
 | 1:N
PracticeAttempt
 +---- Question
 +---- Story
```

## 11. Future-Proofing PracticeAttempt

Anticipate (but do **not** implement in the MVP):

```typescript
type AttemptEvaluation = {
  id: string
  attemptId: string
  structureScore?: number
  ownershipScore?: number
  specificityScore?: number
  impactScore?: number
  reflectionScore?: number
  concisenessScore?: number
  strengths?: string
  improvement?: string
  model?: string
  createdAt: Date
}
```

Prefer a **separate table** rather than embedding scores into PracticeAttempt. This
allows re-running evaluation, comparing models, changing rubrics, and retaining
evaluation history.

## 12. Database Schema

```
users              questions          stories            practice_attempts
-----              ---------          -------            -----------------
id                 id                 id                 id
email              text               user_id            user_id
name               competency         title              question_id
created_at         created_at         description        story_id
updated_at                            created_at         response
                                      updated_at         duration_seconds
                                                         reflection
                                                         created_at
                                                         updated_at
```

Foreign keys: `stories.user_id → users.id` · `practice_attempts.user_id → users.id`
· `practice_attempts.question_id → questions.id` ·
`practice_attempts.story_id → stories.id`

Indexes: `practice_attempts(user_id)` · `(user_id, created_at)` ·
`(user_id, question_id)` · `(user_id, story_id)`

## 13. Suggested Technical Stack

Frontend: Next.js · TypeScript · React · Tailwind CSS.
Backend: Next.js server routes / server actions — a separate API server is
unnecessary. Database: PostgreSQL. ORM: Prisma or Drizzle. Authentication: a managed
service (Clerk, Supabase Auth, Auth.js) rather than a hand-rolled implementation; the
exact provider is not architecturally important. Hosting: Vercel + Neon/Supabase.

**The important constraint is keeping deployment simple.**

## 14. Questions API

```http
GET /api/questions            # optional ?competency=CONFLICT
GET /api/questions/random     # optional ?competency=FAILURE
```

```json
[{ "id": "q1", "text": "Tell me about a time you disagreed with a teammate.", "competency": "CONFLICT" }]
```

## 15. Practice Attempts API

```http
POST   /api/attempts
GET    /api/attempts          # optional ?competency= ?questionId= ?storyId=
GET    /api/attempts/:id
PATCH  /api/attempts/:id      # response, storyId, reflection
DELETE /api/attempts/:id      # optional for first release, recommended
```

Create body:

```json
{
  "questionId": "q1",
  "storyId": "story1",
  "response": "During my distributed systems project...",
  "durationSeconds": 134,
  "reflection": "I should explain my contribution more clearly."
}
```

`GET /api/attempts/:id` should include: the attempt, its question, its story, and
**previous attempts for the same question**.

## 16. Stories API

```http
POST   /api/stories           # { title, description }
GET    /api/stories
PATCH  /api/stories/:id
DELETE /api/stories/:id
```

**Deletion behavior:** do not delete associated attempts. Instead set
`PracticeAttempt.storyId = null`.

## 17. Progress API

```http
GET /api/progress
```

```json
{
  "totalAttempts": 18,
  "questionsPracticed": 12,
  "competencies": [
    { "competency": "TEAMWORK", "attemptCount": 6, "uniqueQuestions": 4 },
    { "competency": "CONFLICT", "attemptCount": 3, "uniqueQuestions": 2 }
  ]
}
```

**Do not create an analytics table.** Compute counts from PracticeAttempt records.

## 18. Practice Timer

Timer exists only to provide useful metadata.

```typescript
const [startedAt, setStartedAt] = useState<number>()
// on start:  startedAt = Date.now()
// on submit: durationSeconds = Math.round((Date.now() - startedAt) / 1000)
```

The server should trust the value. **No anti-cheat logic is necessary.**

## 19. Validation

**Practice Attempt** — required: `questionId`, `response`. `response.length >= 1` and
`<= reasonable database limit`. Story and reflection optional.

**Story** — required: `title`. Suggested: `title <= 100` chars,
`description <= 2000` chars.

## 20. Authorization

Every user-owned query must be scoped by the authenticated user ID.

```typescript
// Correct
db.practiceAttempt.findFirst({ where: { id: attemptId, userId: currentUser.id } })

// Incorrect
db.practiceAttempt.findUnique({ where: { id: attemptId } })
```

**Never rely on the frontend to enforce ownership.** Applies to stories, practice
attempts, and future evaluations.

## 21. Seed Data

Question data is committed to the repository at `/src/data/questions.ts` and applied
via `npm run db:seed`. **Do not build an admin interface for managing questions.**

## 22. UI Components

`QuestionCard` · `CompetencyBadge` · `PracticeEditor` · `PracticeTimer` ·
`AttemptCard` · `StorySelector` · `StoryForm` · `ReflectionInput` · `ProgressRow` ·
`EmptyState`

Keep components relatively small. **Avoid building a generalized design system.**

## 23. Empty States

Empty states matter because new users begin with no history.

- **History** — "You haven't completed any practice attempts yet."
  `[ Practice Your First Question ]`
- **Stories** — "You haven't created any stories yet. Stories are experiences you can
  reuse across different behavioral questions." `[ Create Story ]`
- **Progress** — "Complete your first practice session to begin tracking your coverage."

## 24. Error Handling

```
Something went wrong while saving your response.
[ Try Again ]
```

**Do not clear the user's response when saving fails.** Losing a multi-paragraph
interview answer would create a poor experience. Maintain the response in client state
until the save succeeds.

## 25. MVP Analytics

Track: `practice_started` · `practice_completed` · `attempt_saved` · `story_created`
· `attempt_viewed` · `question_changed`.

Funnel: `practice_started → practice_completed → attempt_saved → attempt_viewed_again`

The product question is not "are users opening the app?" but **"are users repeatedly
practicing and reviewing their previous answers?"**

## 26. Key MVP Metrics

- **Practice Completion Rate** — saved attempts / started practice sessions
- **Returning Practice Rate** — another attempt completed within seven days
- **Attempt Review Rate** — how often users revisit previous responses
- **Repeat Question Practice** — how often a question is answered more than once
  (particularly important: repeated practice is a primary value proposition)

## 27. Recommended Repository Structure

```
src/
  app/
    page.tsx
    practice/page.tsx
    practice/[questionId]/page.tsx
    history/page.tsx
    attempts/[attemptId]/page.tsx
    stories/page.tsx
    progress/page.tsx
    api/{questions,attempts,stories,progress}/
  components/
    QuestionCard.tsx  PracticeEditor.tsx  PracticeTimer.tsx
    AttemptCard.tsx   StorySelector.tsx   CompetencyBadge.tsx
  lib/
    auth.ts  db.ts
  data/
    questions.ts
prisma/
  schema.prisma  seed.ts
```

## 28. Prisma Model

See `prisma/schema.prisma` — it implements this section. Deviations are recorded in
[DECISIONS.md](./DECISIONS.md).

## 29. MVP Acceptance Criteria

The MVP is usable when a user can complete this sequence without developer
intervention:

1. Create account.
2. Open Practice.
3. Receive a behavioral question.
4. Type an answer.
5. Complete the practice attempt.
6. Create or choose a Story.
7. Write an optional reflection.
8. Save the response.
9. See the attempt in History.
10. Open the attempt.
11. Practice the same question again.
12. See both attempts associated with the question.
13. Open Progress.
14. See competency practice counts.

**If this entire loop works reliably, the MVP is complete.**

## 30. Development Order

Build **vertically**, not model-by-model.

- **Phase 1** — Question seed data → Practice page → answer textarea → save
  PracticeAttempt. At the end, answering and saving must work.
- **Phase 2** — History, attempt detail, previous attempts.
- **Phase 3** — Story creation, selection, association.
- **Phase 4** — Progress page, competency counts, question practice counts.
- **Phase 5** — Polish: empty states, loading states, error handling, responsive
  design, basic analytics.

## 31. Architecture Principle

Structure the application around **PracticeAttempt**, not around AI conversations.

```
Question → PracticeAttempt
             +---- Response
             +---- Story
             +---- Reflection
             +---- Duration
             +---- Future Evaluation
```

This allows future capabilities to operate on historical practice data.

## 32. Future V2 Architecture

```
PracticeAttempt → Evaluation Service → AttemptEvaluation
```

Evaluation may contain: Structure · Ownership · Specificity · Impact · Reflection ·
Conciseness. The UI could then compare evaluations across attempts for the same question.

## 33. Future V3 Architecture

Voice practice extends PracticeAttempt rather than replacing it:
`responseType` (TEXT | AUDIO), `audioUrl`, `transcript`.

```
Audio Recording → Storage → Transcription → PracticeAttempt.response
```

The transcript becomes another form of response text for the same scoring pipeline.

## 34. Most Important Product Constraint

**Do not allow future AI functionality to delay the MVP.**

The first version must prove this loop is useful:

```
practice → save → review → practice again
```

> Does having a persistent history of behavioral answers make interview practice
> meaningfully better than answering isolated questions?

If yes, AI scoring, follow-up questioning, voice interviews, and personalized coaching
become natural extensions of the data already being collected.
