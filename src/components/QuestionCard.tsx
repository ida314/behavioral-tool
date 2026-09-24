import Link from "next/link";
import { CompetencyBadge } from "@/components/CompetencyBadge";
import { formatDateShort } from "@/lib/format";
import { describeStatus, type ReviewStatus } from "@/lib/review";
import type {
  QuestionPracticeStats,
  QuestionRecord,
} from "@/lib/queries/questions";

/**
 * SPEC §8.2. `featured` is the large card at the top of the practice page;
 * the plain variant is a row in the question list below it.
 */
export function QuestionCard({
  question,
  stats,
  status,
  featured = false,
  children,
}: {
  question: QuestionRecord;
  stats?: QuestionPracticeStats;
  /** Where the question sits in spaced review (ADR-011). */
  status?: ReviewStatus;
  featured?: boolean;
  /** Extra actions rendered next to "Practice Question" (e.g. Another Question). */
  children?: React.ReactNode;
}) {
  const attemptCount = stats?.attemptCount ?? 0;

  return (
    <article
      className={
        featured
          ? "rounded-lg border border-zinc-300 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
          : "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <CompetencyBadge competency={question.competency} />
        {status ? <ReviewLabel status={status} /> : null}
      </div>

      <h2
        className={
          featured
            ? "mt-3 text-xl leading-snug font-medium text-balance"
            : "mt-3 leading-snug"
        }
      >
        {question.text}
      </h2>

      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {attemptCount === 0
          ? "Not practiced yet"
          : `Previously practiced: ${attemptCount} ${attemptCount === 1 ? "time" : "times"}`}
        {stats?.lastPracticedAt
          ? ` · last on ${formatDateShort(stats.lastPracticedAt)}`
          : ""}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href={`/practice/${question.id}`}
          className={
            featured
              ? "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              : "text-sm font-medium text-zinc-900 underline underline-offset-4 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-400"
          }
        >
          {featured ? "Practice Question" : "Practice"}
        </Link>
        {children}
      </div>
    </article>
  );
}

function ReviewLabel({ status }: { status: ReviewStatus }) {
  const tone =
    status.kind === "due"
      ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      : status.kind === "new"
        ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
        : "text-zinc-500 dark:text-zinc-400";
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${tone}`}>
      {describeStatus(status)}
    </span>
  );
}

