import Link from "next/link";
import { competencyLabel } from "@/lib/competency";
import type { CompetencyProgress } from "@/lib/queries/progress";

/**
 * One competency on the Progress page (SPEC §8.8). The bar is scaled against the
 * user's own busiest competency — this page answers "what am I neglecting?", not
 * "how do I compare to anyone else".
 */
export function ProgressRow({
  row,
  max,
}: {
  row: CompetencyProgress;
  max: number;
}) {
  const width = max > 0 ? Math.round((row.attemptCount / max) * 100) : 0;

  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-4">
        <Link
          href={`/practice?competency=${row.competency}`}
          className="font-medium hover:underline hover:underline-offset-4"
        >
          {competencyLabel(row.competency)}
        </Link>
        <span className="tabular-nums">{row.attemptCount}</span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
            style={{ width: `${width}%` }}
          />
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {row.uniqueQuestions}{" "}
          {row.uniqueQuestions === 1 ? "question" : "questions"}
        </span>
      </div>
    </li>
  );
}
