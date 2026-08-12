/**
 * The shape every Server Action returns.
 *
 * Actions report failure by returning, not by throwing: a thrown error (or a
 * `redirect()`) unwinds the client component that is holding the user's answer,
 * and SPEC §24 says that answer must survive a failed save.
 *
 * Lives outside the `"use server"` modules so those files export only actions.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/** The message SPEC §24 specifies for a failed save. */
export const SAVE_FAILED_MESSAGE =
  "Something went wrong while saving your response.";
