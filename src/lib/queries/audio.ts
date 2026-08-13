import { db } from "@/lib/db";

/**
 * The only place the audio bytes are ever read (ADR-010).
 *
 * Scoped on `userId` like every other user-owned read (SPEC §20): a recording is
 * the most private thing this app stores, so the ownership check is part of the
 * same query that fetches the bytes, not a separate step that could be skipped.
 */
export async function getAttemptAudio(
  userId: string,
  attemptId: string,
): Promise<{ data: Uint8Array; mimeType: string; byteSize: number } | null> {
  return db.attemptAudio.findFirst({
    where: { attemptId, userId },
    select: { data: true, mimeType: true, byteSize: true },
  });
}
