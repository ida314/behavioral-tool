import { db } from "@/lib/db";
import {
  reviewState,
  type ReviewAttempt,
  type ReviewState,
} from "@/lib/review";

/**
 * Review state for every question this user has practiced (ADR-011).
 *
 * One scan of their attempts, oldest first, grouped in memory — the same
 * computed-on-read approach as progress, and for the same reason: a stored
 * schedule would be a second copy of the history that could disagree with it.
 */
export async function reviewStatesMap(
  userId: string,
): Promise<Map<string, ReviewState>> {
  const attempts = await db.practiceAttempt.findMany({
    where: { userId },
    select: { questionId: true, createdAt: true, confidence: true },
    orderBy: { createdAt: "asc" },
  });

  const byQuestion = new Map<string, ReviewAttempt[]>();
  for (const { questionId, ...attempt } of attempts) {
    const list = byQuestion.get(questionId);
    if (list) list.push(attempt);
    else byQuestion.set(questionId, [attempt]);
  }

  const states = new Map<string, ReviewState>();
  for (const [questionId, list] of byQuestion) {
    const state = reviewState(list);
    if (state) states.set(questionId, state);
  }
  return states;
}

/** One question's state, for the save panel's "Solid · in 7 days" preview. */
export async function questionReviewState(
  userId: string,
  questionId: string,
): Promise<ReviewState | null> {
  const attempts = await db.practiceAttempt.findMany({
    where: { userId, questionId },
    select: { createdAt: true, confidence: true },
    orderBy: { createdAt: "asc" },
  });
  return reviewState(attempts);
}
