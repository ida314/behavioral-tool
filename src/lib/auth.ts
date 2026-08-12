import { db } from "@/lib/db";

/**
 * The single source of identity for the whole app.
 *
 * Right now this is a **dev stub**: every request is attributed to one seeded
 * local user (see docs/DECISIONS.md ADR-003). The point of routing all identity
 * through `requireUser()` is that swapping in a real provider later is a change
 * to this file only — every caller is already written to be user-scoped.
 *
 * RULE: never read a user id from the request body, a query string, or a prop.
 * Every user-owned query must be scoped by `(await requireUser()).id`.
 */
export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
};

const DEV_USER: SessionUser = {
  id: process.env.DEV_USER_ID ?? "dev-user",
  email: process.env.DEV_USER_EMAIL ?? "dev@example.com",
  name: process.env.DEV_USER_NAME ?? "Dev User",
};

// Memoized per process so the dev user row exists without an upsert per request.
let ensured: Promise<void> | undefined;

function ensureDevUser(): Promise<void> {
  ensured ??= db.user
    .upsert({
      where: { id: DEV_USER.id },
      create: {
        id: DEV_USER.id,
        email: DEV_USER.email,
        name: DEV_USER.name,
      },
      update: {},
    })
    .then(() => undefined)
    .catch((error) => {
      // Let the next call retry rather than caching a failed bootstrap.
      ensured = undefined;
      throw error;
    });
  return ensured;
}

/**
 * Returns the authenticated user, creating the dev user on first use.
 * Throws if there is no user — callers should not have to null-check.
 */
export async function requireUser(): Promise<SessionUser> {
  await ensureDevUser();
  return DEV_USER;
}
