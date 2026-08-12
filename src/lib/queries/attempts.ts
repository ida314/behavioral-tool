import { db } from "@/lib/db";
import type { Competency } from "@/lib/competency";

/**
 * Practice attempt reads (SPEC §8.5, §8.6).
 *
 * Every function takes an explicit `userId` and scopes on it. Callers pass
 * `(await requireUser()).id` — never an id from a param, prop, or form (SPEC §20).
 */

export type AttemptListItem = {
  id: string;
  createdAt: Date;
  durationSeconds: number | null;
  question: { id: string; text: string; competency: Competency };
  story: { id: string; title: string } | null;
};

const listSelect = {
  id: true,
  createdAt: true,
  durationSeconds: true,
  question: { select: { id: true, text: true, competency: true } },
  story: { select: { id: true, title: true } },
} as const;

export async function listAttempts(
  userId: string,
  options: { competency?: Competency } = {},
): Promise<AttemptListItem[]> {
  return db.practiceAttempt.findMany({
    where: {
      userId,
      ...(options.competency
        ? { question: { competency: options.competency } }
        : {}),
    },
    select: listSelect,
    orderBy: { createdAt: "desc" },
  });
}

export async function countAttempts(userId: string): Promise<number> {
  return db.practiceAttempt.count({ where: { userId } });
}

export async function mostRecentAttempt(
  userId: string,
): Promise<AttemptListItem | null> {
  return db.practiceAttempt.findFirst({
    where: { userId },
    select: listSelect,
    orderBy: { createdAt: "desc" },
  });
}

export type AttemptSummary = {
  id: string;
  createdAt: Date;
  attemptNumber: number;
};

export type AttemptDetail = {
  id: string;
  createdAt: Date;
  response: string;
  reflection: string | null;
  durationSeconds: number | null;
  question: { id: string; text: string; competency: Competency };
  story: { id: string; title: string; description: string | null } | null;
  /** 1-based position among this user's attempts at the same question, oldest first. */
  attemptNumber: number;
  /** Earlier attempts at the same question, newest first (SPEC §8.6). */
  previousAttempts: AttemptSummary[];
};

/**
 * The attempt detail page (SPEC §8.6) — the feature the product exists to test.
 *
 * Returns the attempt plus every *other* attempt at the same question, numbered
 * so a user can see "Attempt #3" against "#2" and "#1". This is what the
 * `(userId, questionId)` index in prisma/schema.prisma is for.
 */
export async function getAttemptDetail(
  userId: string,
  attemptId: string,
): Promise<AttemptDetail | null> {
  // findFirst + userId, never findUnique by id alone (SPEC §20). A miss here is
  // indistinguishable from "does not exist", which is exactly what we want.
  const attempt = await db.practiceAttempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      id: true,
      createdAt: true,
      response: true,
      reflection: true,
      durationSeconds: true,
      question: { select: { id: true, text: true, competency: true } },
      story: { select: { id: true, title: true, description: true } },
    },
  });

  if (!attempt) return null;

  const siblings = await db.practiceAttempt.findMany({
    where: { userId, questionId: attempt.question.id },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const numbered = siblings.map((sibling, index) => ({
    ...sibling,
    attemptNumber: index + 1,
  }));

  const current = numbered.find((sibling) => sibling.id === attempt.id);

  return {
    ...attempt,
    attemptNumber: current?.attemptNumber ?? numbered.length,
    previousAttempts: numbered
      .filter((sibling) => sibling.attemptNumber < (current?.attemptNumber ?? 0))
      .reverse(),
  };
}
