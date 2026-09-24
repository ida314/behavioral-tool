import { AnotherQuestionButton } from "@/components/AnotherQuestionButton";
import { CompetencyFilter } from "@/components/CompetencyFilter";
import { QuestionCard } from "@/components/QuestionCard";
import { requireUser } from "@/lib/auth";
import { isCompetency } from "@/lib/competency";
import {
  listQuestions,
  questionPracticeStatsMap,
} from "@/lib/queries/questions";
import { reviewStatesMap } from "@/lib/queries/review";
import { reviewQueue, reviewStatus } from "@/lib/review";

/**
 * Practice page (SPEC §8.2) — the next question in review order, plus the
 * filtered bank.
 *
 * Filter and position-in-queue both live in the URL, so the page survives a
 * refresh and needs no client state of its own. `pick` counts skips: 0 is the
 * top of the queue, and "Another Question" steps down it (ADR-011).
 */
export default async function PracticePage(props: PageProps<"/practice">) {
  const searchParams = await props.searchParams;
  const user = await requireUser();

  const rawCompetency = searchParams.competency;
  const competency =
    typeof rawCompetency === "string" && isCompetency(rawCompetency)
      ? rawCompetency
      : null;

  const rawPick = searchParams.pick;
  const parsedPick =
    typeof rawPick === "string" ? Number.parseInt(rawPick, 10) : 0;
  const pick = Number.isNaN(parsedPick) ? 0 : Math.abs(parsedPick);

  const [questions, stats, states] = await Promise.all([
    listQuestions(competency ?? undefined),
    questionPracticeStatsMap(user.id),
    reviewStatesMap(user.id),
  ]);

  const now = new Date();
  const queue = reviewQueue(questions, states, now);
  const featured = queue.length > 0 ? queue[pick % queue.length] : null;
  const statusOf = (id: string) => reviewStatus(states.get(id), now);

  const count = (kind: "due" | "new") =>
    questions.filter((question) => statusOf(question.id).kind === kind).length;
  const dueCount = count("due");
  const newCount = count("new");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <CompetencyFilter value={competency} basePath="/practice" />
      </div>

      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {dueCount === 0
          ? "Nothing due for review"
          : `${dueCount} due for review`}
        {newCount > 0 ? ` · ${newCount} not practiced yet` : ""}
      </p>

      {featured ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Up next
          </h2>
          <QuestionCard
            question={featured}
            stats={stats.get(featured.id)}
            status={statusOf(featured.id)}
            featured
          >
            <AnotherQuestionButton competency={competency} pick={pick} />
          </QuestionCard>
        </div>
      ) : null}

      <h2 className="mt-10 text-sm font-medium tracking-wide text-zinc-500 uppercase">
        All questions ({questions.length})
      </h2>
      <ul className="mt-4 space-y-3">
        {questions.map((question) => (
          <li key={question.id}>
            <QuestionCard
              question={question}
              stats={stats.get(question.id)}
              status={statusOf(question.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
