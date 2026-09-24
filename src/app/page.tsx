import Link from "next/link";
import { CompetencyBadge } from "@/components/CompetencyBadge";
import { requireUser } from "@/lib/auth";
import { COMPETENCIES } from "@/lib/competency";
import { formatDate } from "@/lib/format";
import { mostRecentAttempt } from "@/lib/queries/attempts";
import { getProgress } from "@/lib/queries/progress";
import { reviewStatesMap } from "@/lib/queries/review";
import { reviewStatus } from "@/lib/review";

/**
 * Dashboard (SPEC §8.1) — a starting point, deliberately not an analytics page.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const [progress, recent, states] = await Promise.all([
    getProgress(user.id),
    mostRecentAttempt(user.id),
    reviewStatesMap(user.id),
  ]);

  // Only practiced questions can be due, so the states map is the whole set.
  const now = new Date();
  const dueCount = [...states.values()].filter(
    (state) => reviewStatus(state, now).kind === "due",
  ).length;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Behavioral Prep</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        {progress.totalAttempts === 0
          ? "Answer a question, save it, and come back to see how your answer changes."
          : `You have completed ${progress.totalAttempts} practice ${
              progress.totalAttempts === 1 ? "attempt" : "attempts"
            }.`}
      </p>

      <dl className="mt-8 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        <Stat label="Due for Review" value={dueCount} />
        <Stat label="Questions Practiced" value={progress.questionsPracticed} />
        <Stat
          label="Competencies Covered"
          value={`${progress.competenciesCovered} / ${COMPETENCIES.length}`}
        />
        <div className="flex items-baseline justify-between gap-4 py-3">
          <dt className="text-zinc-600 dark:text-zinc-400">Most Recent</dt>
          <dd className="text-right">
            {recent ? (
              <Link
                href={`/attempts/${recent.id}`}
                className="inline-flex items-center gap-2 hover:underline hover:underline-offset-4"
              >
                <CompetencyBadge competency={recent.question.competency} />
                <span className="tabular-nums">
                  {formatDate(recent.createdAt)}
                </span>
              </Link>
            ) : (
              <span className="text-zinc-500">—</span>
            )}
          </dd>
        </div>
      </dl>

      <Link
        href="/practice"
        className="mt-8 inline-block rounded-md bg-zinc-900 px-5 py-2.5 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Practice a Question
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
