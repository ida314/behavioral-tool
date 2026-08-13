import Link from "next/link";
import { CompetencyBadge } from "@/components/CompetencyBadge";
import { formatDate, formatDuration } from "@/lib/format";
import type { AttemptListItem } from "@/lib/queries/attempts";

/** One row in History (SPEC §8.5): date, question, competency, story, duration. */
export function AttemptCard({ attempt }: { attempt: AttemptListItem }) {
  return (
    <Link
      href={`/attempts/${attempt.id}`}
      className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
    >
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {formatDate(attempt.createdAt)}
      </p>

      <p className="mt-1.5 leading-snug">{attempt.question.text}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-500 dark:text-zinc-400">
        <CompetencyBadge competency={attempt.question.competency} />
        {attempt.story ? <span>{attempt.story.title}</span> : null}
        {attempt.durationSeconds != null ? (
          <span>{formatDuration(attempt.durationSeconds)}</span>
        ) : null}
        {attempt.responseType === "AUDIO" ? <span>Spoken</span> : null}
      </div>
    </Link>
  );
}
