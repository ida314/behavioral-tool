"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteStory } from "@/lib/actions/stories";

/**
 * Deleting a story keeps every practice attempt that used it — the attempts just
 * lose the association (SPEC §16). The confirmation says so, because "delete"
 * next to a count of attempts reads like it will take them with it.
 */
export function DeleteStoryButton({
  storyId,
  attemptCount,
}: {
  storyId: string;
  attemptCount: number;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteStory(storyId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch {
        setError("Something went wrong while deleting the story.");
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
      >
        Delete
      </button>
    );
  }

  return (
    <div className="text-sm">
      <p className="text-zinc-600 dark:text-zinc-400">
        Delete this story?
        {attemptCount > 0
          ? ` Your ${attemptCount} practice ${attemptCount === 1 ? "attempt" : "attempts"} will be kept.`
          : ""}
      </p>
      {error ? (
        <p className="mt-1 text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="font-medium text-red-600 disabled:opacity-40 dark:text-red-400"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
