import { EmptyState } from "@/components/EmptyState";
import { ProgressRow } from "@/components/ProgressRow";
import { requireUser } from "@/lib/auth";
import { getProgress } from "@/lib/queries/progress";

/**
 * Progress (SPEC §8.8). Intentionally simple: what have I practiced, and what am
 * I neglecting? Competencies with zero attempts stay in the list — they are the
 * more useful half of the answer.
 */
export default async function ProgressPage() {
  const user = await requireUser();
  const progress = await getProgress(user.id);

  const rows = [...progress.competencies].sort(
    (a, b) => b.attemptCount - a.attemptCount,
  );
  const max = rows[0]?.attemptCount ?? 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Progress</h1>

      {progress.totalAttempts === 0 ? (
        <div className="mt-6">
          <EmptyState
            message="Complete your first practice session to begin tracking your coverage."
            actionLabel="Practice a Question"
            actionHref="/practice"
          />
        </div>
      ) : (
        <>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {progress.totalAttempts} practice{" "}
            {progress.totalAttempts === 1 ? "attempt" : "attempts"} across{" "}
            {progress.questionsPracticed}{" "}
            {progress.questionsPracticed === 1 ? "question" : "questions"}.
          </p>

          <ul className="mt-6 divide-y divide-zinc-200 dark:divide-zinc-800">
            {rows.map((row) => (
              <ProgressRow key={row.competency} row={row} max={max} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
