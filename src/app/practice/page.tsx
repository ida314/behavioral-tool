import { AnotherQuestionButton } from "@/components/AnotherQuestionButton";
import { CompetencyFilter } from "@/components/CompetencyFilter";
import { QuestionCard } from "@/components/QuestionCard";
import { requireUser } from "@/lib/auth";
import { isCompetency } from "@/lib/competency";
import {
  listQuestions,
  pickFeaturedQuestion,
  questionPracticeStatsMap,
} from "@/lib/queries/questions";

/**
 * Practice page (SPEC §8.2) — a featured question plus the filtered bank.
 *
 * Filter and featured-question state both live in the URL, so the page is
 * shareable, survives a refresh, and needs no client state of its own.
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
  const seed = typeof rawPick === "string" ? Number.parseInt(rawPick, 10) : 0;

  const [questions, stats] = await Promise.all([
    listQuestions(competency ?? undefined),
    questionPracticeStatsMap(user.id),
  ]);

  const featured = pickFeaturedQuestion(questions, Number.isNaN(seed) ? 0 : seed);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Practice</h1>
        <CompetencyFilter value={competency} basePath="/practice" />
      </div>

      {featured ? (
        <div className="mt-6">
          <QuestionCard
            question={featured}
            stats={stats.get(featured.id)}
            featured
          >
            <AnotherQuestionButton competency={competency} />
          </QuestionCard>
        </div>
      ) : null}

      <h2 className="mt-10 text-sm font-medium tracking-wide text-zinc-500 uppercase">
        All questions ({questions.length})
      </h2>
      <ul className="mt-4 space-y-3">
        {questions.map((question) => (
          <li key={question.id}>
            <QuestionCard question={question} stats={stats.get(question.id)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
