"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createAttemptSchema, type CreateAttemptInput } from "@/lib/validation";
import { SAVE_FAILED_MESSAGE, type ActionResult } from "@/lib/actions/result";

/**
 * Practice attempt writes (SPEC §15).
 *
 * Server Actions are reachable by direct POST, not only through our own UI, so
 * identity and ownership are re-established here rather than trusted from input.
 */

/**
 * Creates a practice attempt and returns its id.
 *
 * This function must never call `redirect()`. A thrown redirect would unwind the
 * client component holding the user's answer, and SPEC §24 requires that answer
 * to survive a failed save. Failures return `{ ok: false }`; the client navigates
 * itself on success.
 */
export async function createAttempt(
  input: CreateAttemptInput,
): Promise<ActionResult<{ attemptId: string }>> {
  try {
    const user = await requireUser();

    const parsed = createAttemptSchema.safeParse(input);
    if (!parsed.success) {
      const field = parsed.error.issues[0]?.path[0];
      return {
        ok: false,
        error:
          field === "response"
            ? "Your response can't be empty."
            : "That practice attempt couldn't be validated.",
      };
    }

    const { questionId, response, storyId, durationSeconds, reflection } =
      parsed.data;

    const question = await db.question.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) {
      return { ok: false, error: "That question no longer exists." };
    }

    // A storyId arrives from the client, so confirm this user owns it before
    // attaching. Never trust the frontend to enforce ownership (SPEC §20).
    let ownedStoryId: string | null = null;
    if (storyId) {
      const story = await db.story.findFirst({
        where: { id: storyId, userId: user.id },
        select: { id: true },
      });
      if (!story) {
        return { ok: false, error: "That story could not be found." };
      }
      ownedStoryId = story.id;
    }

    const attempt = await db.practiceAttempt.create({
      data: {
        userId: user.id,
        questionId,
        storyId: ownedStoryId,
        response,
        durationSeconds: durationSeconds ?? null,
        reflection: reflection ?? null,
      },
      select: { id: true },
    });

    revalidatePath("/");
    revalidatePath("/history");
    revalidatePath("/progress");
    revalidatePath("/stories");

    return { ok: true, data: { attemptId: attempt.id } };
  } catch (error) {
    console.error("createAttempt failed", error);
    return { ok: false, error: SAVE_FAILED_MESSAGE };
  }
}
