import Link from "next/link";
import { notFound } from "next/navigation";
import { CompetencyBadge } from "@/components/CompetencyBadge";
import { requireUser } from "@/lib/auth";
import { track } from "@/lib/analytics";
import { formatDate, formatDuration } from "@/lib/format";
import { getAttemptDetail } from "@/lib/queries/attempts";

/**
 * Attempt detail (SPEC §8.6).
 *
 * The Previous Attempts list is the reason this product exists: seeing the same
 * question answered three times, months apart, is what a stack of isolated
 * practice sessions can never show you.
 */
export default async function AttemptDetailPage(
  props: PageProps<"/attempts/[attemptId]">,
) {
  const { attemptId } = await props.params;
  const user = await requireUser();

  // Scoped lookup: another user's attempt id simply 404s (SPEC §20).
  const attempt = await getAttemptDetail(user.id, attemptId);
  if (!attempt) notFound();

  track("attempt_viewed", {
    attemptId: attempt.id,
    questionId: attempt.question.id,
    attemptNumber: attempt.attemptNumber,
  });

  return (
    <article>
      <h1 className="text-xl leading-snug font-medium text-balance">
        {attempt.question.text}
      </h1>
      <div className="mt-3">
        <CompetencyBadge competency={attempt.question.competency} />
      </div>

      <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">
        Attempt #{attempt.attemptNumber} · {formatDate(attempt.createdAt)}
        {attempt.durationSeconds != null
          ? ` · Duration: ${formatDuration(attempt.durationSeconds)}`
          : ""}
      </p>

      <Section title="Response">
        <p className="leading-relaxed whitespace-pre-wrap">{attempt.response}</p>
      </Section>

      {attempt.story ? (
        <Section title="Story">
          <p className="font-medium">{attempt.story.title}</p>
          {attempt.story.description ? (
            <p className="mt-1 text-zinc-600 dark:text-zinc-400">
              {attempt.story.description}
            </p>
          ) : null}
        </Section>
      ) : null}

      {attempt.reflection ? (
        <Section title="Reflection">
          <p className="leading-relaxed whitespace-pre-wrap">
            {attempt.reflection}
          </p>
        </Section>
      ) : null}

      <Section title="Previous Attempts">
        {attempt.previousAttempts.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">
            This is your first attempt at this question. Answer it again later to
            compare.
          </p>
        ) : (
          <ul className="space-y-2">
            {attempt.previousAttempts.map((previous) => (
              <li key={previous.id}>
                <Link
                  href={`/attempts/${previous.id}`}
                  className="hover:underline hover:underline-offset-4"
                >
                  Attempt #{previous.attemptNumber} —{" "}
                  {formatDate(previous.createdAt)}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <Link
          href={`/practice/${attempt.question.id}`}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Practice this question again
        </Link>
        <Link
          href="/history"
          className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Back to history
        </Link>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <h2 className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
