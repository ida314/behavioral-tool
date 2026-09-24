"use client";

import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import type { Competency } from "@/lib/competency";

/**
 * "Another Question" (SPEC §8.2).
 *
 * Steps one place down the review queue (ADR-011) by bumping `pick` in the
 * URL, so a refresh keeps showing the same question and only this button
 * changes it. Past the end, the page wraps back to the top.
 */
export function AnotherQuestionButton({
  competency,
  pick,
}: {
  competency: Competency | null;
  pick: number;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        const params = new URLSearchParams();
        if (competency) params.set("competency", competency);
        params.set("pick", String(pick + 1));
        track("question_changed", { competency: competency ?? null });
        router.push(`/practice?${params.toString()}`);
      }}
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      Another Question
    </button>
  );
}
