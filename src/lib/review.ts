/**
 * Spaced review, v1 (docs/DECISIONS.md ADR-011).
 *
 * A Leitner ladder derived entirely from a question's attempts. There is no
 * schedule table: replaying a question's attempts in order gives its current
 * step, and the step gives the day it is due again — so the schedule can never
 * drift from the history it is built on.
 *
 * Kept free of any server/Prisma import so the save panel can show "Solid · in
 * 7 days" from the same rules the practice page sorts by.
 */

/** Must stay identical to the `Confidence` enum in prisma/schema.prisma. */
export const CONFIDENCES = ["SHAKY", "OKAY", "SOLID"] as const;

export type Confidence = (typeof CONFIDENCES)[number];

/**
 * Rates the telling, not the answer: whether the story came out fluently. That
 * is what spacing trains, and it is a judgment the user can make honestly
 * without anyone scoring content (SPEC §3).
 */
export const CONFIDENCE_OPTIONS: Record<
  Confidence,
  { label: string; hint: string }
> = {
  SHAKY: { label: "Shaky", hint: "Blanked, rambled, or lost the thread" },
  OKAY: { label: "Okay", hint: "Got there, with some effort" },
  SOLID: { label: "Solid", hint: "Told it cleanly, in about two minutes" },
};

export function isConfidence(value: unknown): value is Confidence {
  return (
    typeof value === "string" && (CONFIDENCES as readonly string[]).includes(value)
  );
}

/**
 * Days until a question comes back, per step. Capped at two weeks: interview
 * prep runs for weeks, not months, so nothing should rotate out of sight before
 * the interview it is being practiced for.
 */
export const STEP_DAYS = [1, 3, 7, 14] as const;

const TOP_STEP = STEP_DAYS.length - 1;

export type ReviewAttempt = {
  createdAt: Date;
  confidence: Confidence | null;
};

export type ReviewState = {
  step: number;
  dueAt: Date;
};

export type ReviewStatus =
  | { kind: "new" }
  | { kind: "due"; step: number; daysOverdue: number }
  | { kind: "later"; step: number; daysUntil: number };

/**
 * Solid climbs a step, Shaky drops to the bottom, Okay holds. A Solid only
 * climbs when the question was actually due: telling a story well an hour after
 * the last telling proves nothing about remembering it, and spacing is the part
 * that does the work.
 */
function nextStep(step: number, confidence: Confidence | null, due: boolean) {
  if (confidence === "SHAKY") return 0;
  if (confidence === "SOLID" && due) return Math.min(step + 1, TOP_STEP);
  return step; // OKAY, and attempts saved before ratings existed
}

/** Whole days, so something practiced at 11pm is due the next morning. */
function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86_400_000); // round, not floor: DST days are 23h or 25h
}

function apply(
  state: ReviewState | null,
  confidence: Confidence | null,
  at: Date,
): ReviewState {
  const step = state
    ? nextStep(state.step, confidence, at >= state.dueAt)
    : nextStep(0, confidence, true);
  return { step, dueAt: addDays(startOfDay(at), STEP_DAYS[step]) };
}

/** `attempts` must be oldest first. Null for a question never practiced. */
export function reviewState(attempts: ReviewAttempt[]): ReviewState | null {
  let state: ReviewState | null = null;
  for (const attempt of attempts) {
    state = apply(state, attempt.confidence, attempt.createdAt);
  }
  return state;
}

export function reviewStatus(
  state: ReviewState | null | undefined,
  now: Date,
): ReviewStatus {
  if (!state) return { kind: "new" };
  const days = daysBetween(state.dueAt, now);
  return days >= 0
    ? { kind: "due", step: state.step, daysOverdue: days }
    : { kind: "later", step: state.step, daysUntil: -days };
}

/** How many days each rating would send this question away for, if saved now. */
export function previewIntervals(
  state: ReviewState | null,
  now: Date,
): Record<Confidence, number> {
  const days = (confidence: Confidence) =>
    STEP_DAYS[apply(state, confidence, now).step];
  return { SHAKY: days("SHAKY"), OKAY: days("OKAY"), SOLID: days("SOLID") };
}

/**
 * What to practice next: due questions, most overdue first; then questions
 * never practiced, in bank order; then everything else, soonest due first.
 * Fresh questions wait behind due ones so a backlog never grows unnoticed.
 */
export function reviewQueue<T extends { id: string }>(
  questions: T[],
  states: Map<string, ReviewState>,
  now: Date,
): T[] {
  const rank = (question: T): [number, number] => {
    const state = states.get(question.id);
    if (!state) return [1, 0];
    return [state.dueAt <= now ? 0 : 2, state.dueAt.getTime()];
  };
  // Array.prototype.sort is stable, so ties keep bank order.
  return [...questions].sort((a, b) => {
    const [groupA, keyA] = rank(a);
    const [groupB, keyB] = rank(b);
    return groupA - groupB || keyA - keyB;
  });
}

/** `tomorrow`, `in 3 days`. */
export function formatInterval(days: number): string {
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

/** `Due today`, `Due · 2 days overdue`, `Back in 3 days`, `New`. */
export function describeStatus(status: ReviewStatus): string {
  switch (status.kind) {
    case "new":
      return "New";
    case "due":
      return status.daysOverdue === 0
        ? "Due today"
        : `Due · ${status.daysOverdue} ${status.daysOverdue === 1 ? "day" : "days"} overdue`;
    case "later":
      return `Back ${formatInterval(status.daysUntil)}`;
  }
}

