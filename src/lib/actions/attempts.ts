"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  createAttemptSchema,
  createAudioAttemptSchema,
  type CreateAttemptInput,
} from "@/lib/validation";
import {
  MAX_AUDIO_BYTES,
  baseMimeType,
  formatBytes,
  isAllowedAudioMimeType,
} from "@/lib/audio";
import { SAVE_FAILED_MESSAGE, type ActionResult } from "@/lib/actions/result";

/**
 * Practice attempt writes (SPEC §15).
 *
 * Server Actions are reachable by direct POST, not only through our own UI, so
 * identity and ownership are re-established here rather than trusted from input.
 *
 * Neither entry point may ever call `redirect()`. A thrown redirect would unwind
 * the client component holding the user's answer, and SPEC §24 requires that
 * answer to survive a failed save. Failures return `{ ok: false }`; the client
 * navigates itself on success.
 */

function revalidateAttemptViews() {
  revalidatePath("/");
  revalidatePath("/history");
  revalidatePath("/progress");
  revalidatePath("/stories");
}

/** Shared checks: the question must exist and a story must belong to this user. */
async function resolveReferences(
  userId: string,
  questionId: string,
  storyId: string | undefined,
): Promise<{ ok: true; storyId: string | null } | { ok: false; error: string }> {
  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!question) {
    return { ok: false, error: "That question no longer exists." };
  }

  // A storyId arrives from the client, so confirm this user owns it before
  // attaching. Never trust the frontend to enforce ownership (SPEC §20).
  if (!storyId) return { ok: true, storyId: null };

  const story = await db.story.findFirst({
    where: { id: storyId, userId },
    select: { id: true },
  });
  if (!story) {
    return { ok: false, error: "That story could not be found." };
  }
  return { ok: true, storyId: story.id };
}

/** Creates a typed practice attempt and returns its id. */
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

    const refs = await resolveReferences(user.id, questionId, storyId);
    if (!refs.ok) return refs;

    const attempt = await db.practiceAttempt.create({
      data: {
        userId: user.id,
        questionId,
        storyId: refs.storyId,
        response,
        responseType: "TEXT",
        durationSeconds: durationSeconds ?? null,
        reflection: reflection ?? null,
      },
      select: { id: true },
    });

    revalidateAttemptViews();
    return { ok: true, data: { attemptId: attempt.id } };
  } catch (error) {
    console.error("createAttempt failed", error);
    return { ok: false, error: SAVE_FAILED_MESSAGE };
  }
}

/**
 * Creates a spoken practice attempt: the recording *and* the text it produced.
 *
 * Takes FormData because the audio is a File. The audio row is created nested
 * inside the attempt insert, so it is one transaction — an attempt marked AUDIO
 * can never exist without its recording.
 */
export async function createAudioAttempt(
  formData: FormData,
): Promise<ActionResult<{ attemptId: string }>> {
  try {
    const user = await requireUser();

    const file = formData.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "The recording was missing from that save." };
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return {
        ok: false,
        error: `That recording is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_AUDIO_BYTES)}.`,
      };
    }
    if (file.type && !isAllowedAudioMimeType(file.type)) {
      return { ok: false, error: `Unsupported audio format: ${file.type}.` };
    }

    const rawDuration = formData.get("durationSeconds");
    const parsed = createAudioAttemptSchema.safeParse({
      questionId: formData.get("questionId"),
      response: formData.get("response"),
      transcript: formData.get("transcript"),
      storyId: formData.get("storyId") ?? undefined,
      reflection: formData.get("reflection") ?? undefined,
      durationSeconds:
        typeof rawDuration === "string" && rawDuration.length > 0
          ? Number(rawDuration)
          : undefined,
    });

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

    const {
      questionId,
      response,
      transcript,
      storyId,
      durationSeconds,
      reflection,
    } = parsed.data;

    const refs = await resolveReferences(user.id, questionId, storyId);
    if (!refs.ok) return refs;

    const attempt = await db.practiceAttempt.create({
      data: {
        userId: user.id,
        questionId,
        storyId: refs.storyId,
        response,
        responseType: "AUDIO",
        transcript: transcript ?? null,
        durationSeconds: durationSeconds ?? null,
        reflection: reflection ?? null,
        audio: {
          create: {
            userId: user.id,
            data: new Uint8Array(await file.arrayBuffer()),
            mimeType: baseMimeType(file.type || "audio/webm"),
            byteSize: file.size,
          },
        },
      },
      select: { id: true },
    });

    revalidateAttemptViews();
    return { ok: true, data: { attemptId: attempt.id } };
  } catch (error) {
    console.error("createAudioAttempt failed", error);
    return { ok: false, error: SAVE_FAILED_MESSAGE };
  }
}
