/**
 * Shared audio constraints. Safe to import from client components — no Node
 * built-ins here (the transcription pipeline lives in src/lib/transcription.ts).
 */

/** Keep in step with `bodySizeLimit` in next.config.ts, which must be larger. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

/**
 * Containers a browser MediaRecorder actually produces. Chrome and Firefox emit
 * WebM/Opus, Safari emits MP4/AAC. The list is a validation allowlist, not a
 * preference order — ffmpeg sniffs the real format regardless.
 */
export const ALLOWED_AUDIO_MIME_TYPES = [
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
] as const;

/** MediaRecorder appends codec details: `audio/webm;codecs=opus`. */
export function baseMimeType(mimeType: string): string {
  return mimeType.split(";")[0].trim().toLowerCase();
}

export function isAllowedAudioMimeType(mimeType: string): boolean {
  return (ALLOWED_AUDIO_MIME_TYPES as readonly string[]).includes(
    baseMimeType(mimeType),
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
