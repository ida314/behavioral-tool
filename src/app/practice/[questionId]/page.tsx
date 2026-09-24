import { notFound } from "next/navigation";
import { PracticeEditor } from "@/components/PracticeEditor";
import { requireUser } from "@/lib/auth";
import { getQuestion } from "@/lib/queries/questions";
import { questionReviewState } from "@/lib/queries/review";
import { listStoryOptions } from "@/lib/queries/stories";
import { previewIntervals } from "@/lib/review";

/**
 * Practice session (SPEC §8.3). Its own route rather than local state on
 * /practice, so "Practice this question again" has a URL to link to and a
 * refresh mid-answer does not lose the question (ADR-006).
 */
export default async function PracticeSessionPage(
  props: PageProps<"/practice/[questionId]">,
) {
  const { questionId } = await props.params;
  const user = await requireUser();

  const [question, stories, reviewState] = await Promise.all([
    getQuestion(questionId),
    listStoryOptions(user.id),
    questionReviewState(user.id, questionId),
  ]);

  if (!question) notFound();

  return (
    <PracticeEditor
      question={question}
      stories={stories}
      intervals={previewIntervals(reviewState, new Date())}
    />
  );
}
