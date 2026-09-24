import { z } from "zod";
import { CONFIDENCES } from "@/lib/review";

/**
 * Input validation at the server-action boundary (SPEC §19, ADR-009).
 *
 * Nothing here validates a user id — identity always comes from `requireUser()`,
 * never from input (SPEC §20).
 */

/** Above any real interview answer, below anything abusive (ADR-009). */
export const RESPONSE_MAX = 20_000;
export const REFLECTION_MAX = 2_000;
export const STORY_TITLE_MAX = 100;
export const STORY_DESCRIPTION_MAX = 2_000;

/** Treat a blank optional textarea as "not provided" rather than an empty string. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional();

export const createAttemptSchema = z.object({
  questionId: z.string().min(1),
  response: z.string().trim().min(1).max(RESPONSE_MAX),
  storyId: z
    .string()
    .trim()
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  reflection: optionalText(REFLECTION_MAX),
  // Optional: rating is a nudge, never a gate on saving (SPEC §24, ADR-011).
  confidence: z.enum(CONFIDENCES).optional(),
});

export type CreateAttemptInput = z.input<typeof createAttemptSchema>;

/**
 * A spoken attempt. `response` is what the user saved and `transcript` is the
 * unedited speech-to-text output — they differ whenever the transcript was
 * corrected before saving, which is the normal case (ADR-010).
 *
 * `transcript` is optional on purpose: if transcription fails, the recording
 * plus a typed answer must still be savable. Refusing the save would throw away
 * a take the user cannot repeat.
 */
export const createAudioAttemptSchema = createAttemptSchema.extend({
  transcript: optionalText(RESPONSE_MAX),
});

export type CreateAudioAttemptInput = z.input<typeof createAudioAttemptSchema>;

export const createStorySchema = z.object({
  title: z.string().trim().min(1).max(STORY_TITLE_MAX),
  description: optionalText(STORY_DESCRIPTION_MAX),
});

export type CreateStoryInput = z.input<typeof createStorySchema>;

export const updateStorySchema = createStorySchema.extend({
  id: z.string().min(1),
});

export type UpdateStoryInput = z.input<typeof updateStorySchema>;
