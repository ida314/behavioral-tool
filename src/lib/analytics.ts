/**
 * MVP analytics shim (SPEC §25, docs/DECISIONS.md ADR-008).
 *
 * The call sites are the expensive part and they are only accurate if placed while
 * each flow is built. Choosing a vendor later is a change to this file alone.
 */

export type AnalyticsEvent =
  | "practice_started"
  | "practice_completed"
  | "attempt_saved"
  | "story_created"
  | "attempt_viewed"
  | "question_changed"
  // Beyond the six in SPEC §25: whether people actually practice out loud is
  // the question the audio feature exists to answer (ADR-010).
  | "recording_transcribed";

type EventProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: AnalyticsEvent, props?: EventProps): void {
  if (process.env.NODE_ENV === "production") return;
  console.debug(`[analytics] ${event}`, props ?? {});
}
