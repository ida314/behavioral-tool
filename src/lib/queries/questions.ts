import { db } from "@/lib/db";
import type { Competency } from "@/lib/competency";

/**
 * Question reads (SPEC §8.2).
 *
 * `Question` is the one system-owned table, so these are not user-scoped — but
 * anything counting a user's *practice* of a question is (SPEC §20).
 */

export type QuestionRecord = {
  id: string;
  text: string;
  competency: Competency;
};

export async function listQuestions(
  competency?: Competency,
): Promise<QuestionRecord[]> {
  return db.question.findMany({
    where: competency ? { competency } : undefined,
    select: { id: true, text: true, competency: true },
    // Stable order: ids are hand-assigned and never renumbered (ADR-004), so the
    // bank looks the same on every render.
    orderBy: { id: "asc" },
  });
}

export async function getQuestion(id: string): Promise<QuestionRecord | null> {
  return db.question.findUnique({
    where: { id },
    select: { id: true, text: true, competency: true },
  });
}

export type QuestionPracticeStats = {
  attemptCount: number;
  lastPracticedAt: Date | null;
};

/**
 * "Previously practiced: 2 times" for every question at once.
 *
 * One `groupBy` instead of a count per card — the practice page renders up to 53
 * questions and an N+1 here would be the app's first performance bug.
 */
export async function questionPracticeStatsMap(
  userId: string,
): Promise<Map<string, QuestionPracticeStats>> {
  const rows = await db.practiceAttempt.groupBy({
    by: ["questionId"],
    where: { userId },
    _count: { _all: true },
    _max: { createdAt: true },
  });

  return new Map(
    rows.map((row) => [
      row.questionId,
      {
        attemptCount: row._count._all,
        lastPracticedAt: row._max.createdAt,
      },
    ]),
  );
}

/**
 * Deterministic pick from a numeric seed carried in the URL.
 *
 * Seeding from the URL rather than calling Math.random() during render means a
 * refresh keeps the same question and only "Another Question" changes it.
 */
export function pickFeaturedQuestion<T>(items: T[], seed: number): T | null {
  if (items.length === 0) return null;
  const normalized = Number.isFinite(seed) ? Math.abs(Math.floor(seed)) : 0;
  return items[normalized % items.length];
}
