import { db } from "@/lib/db";
import type { Competency } from "@/lib/competency";
import type { Confidence } from "@/lib/review";

/**
 * Practice attempt reads (SPEC §8.5, §8.6).
 *
 * Every function takes an explicit `userId` and scopes on it. Callers pass
 * `(await requireUser()).id` — never an id from a param, prop, or form (SPEC §20).
 */

export type ResponseType = "TEXT" | "AUDIO";

export type AttemptListItem = {
  id: string;
  createdAt: Date;
  durationSeconds: number | null;
  responseType: ResponseType;
  question: { id: string; text: string; competency: Competency };
  story: { id: string; title: string } | null;
};

// Note what is absent: `audio`. Selecting the relation would pull a multi-megabyte
// bytea for every row in History. Audio is only ever fetched by the playback
// route, one attempt at a time (ADR-010).
const listSelect = {
  id: true,
  createdAt: true,
  durationSeconds: true,
  responseType: true,
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
  responseType: ResponseType;
  /** Unedited speech-to-text output; null for typed attempts. */
  transcript: string | null;
  /** Metadata only — the bytes are streamed by the playback route. */
  audio: { mimeType: string; byteSize: number } | null;
  reflection: string | null;
  /** The user's own rating of the telling; null when they skipped it (ADR-011). */
  confidence: Confidence | null;
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
      responseType: true,
      transcript: true,
      reflection: true,
      confidence: true,
      durationSeconds: true,
      question: { select: { id: true, text: true, competency: true } },
      story: { select: { id: true, title: true, description: true } },
      // Metadata only — never `data`, or opening an attempt would load the
      // whole recording into memory just to render a player.
      audio: { select: { mimeType: true, byteSize: true } },
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
