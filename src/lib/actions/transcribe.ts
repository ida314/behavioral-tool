"use server";

import { requireUser } from "@/lib/auth";
import { transcribeAudio, TranscriptionError } from "@/lib/transcription";
import {
  MAX_AUDIO_BYTES,
  formatBytes,
  isAllowedAudioMimeType,
} from "@/lib/audio";
import type { ActionResult } from "@/lib/actions/result";

/**
 * Transcribes a recording and hands the text back for the user to review and
 * edit before saving (ADR-010).
 *
 * The audio is uploaded once here and again with the attempt, rather than being
 * parked in server-side staging between the two steps. Opus is around 24 kbps,
 * so a three-minute answer is well under a megabyte — not worth a staging area
 * that would need its own expiry, cleanup, and ownership rules.
 */
export async function transcribeRecording(
  formData: FormData,
): Promise<ActionResult<{ transcript: string }>> {
  try {
    // Transcription is CPU-heavy, so it is gated on a session even though it
    // writes nothing. Server Actions accept direct POSTs.
    await requireUser();

    const file = formData.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "No recording was received." };
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

    const transcript = await transcribeAudio(
      new Uint8Array(await file.arrayBuffer()),
    );

    if (transcript.length === 0) {
      return {
        ok: false,
        error:
          "No speech was detected in that recording. Check your microphone and try again.",
      };
    }

    return { ok: true, data: { transcript } };
  } catch (error) {
    console.error("transcribeRecording failed", error);
    return {
      ok: false,
      error:
        error instanceof TranscriptionError
          ? error.message
          : "Something went wrong while transcribing your recording.",
    };
  }
}
