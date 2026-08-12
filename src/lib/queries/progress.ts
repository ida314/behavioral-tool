import { db } from "@/lib/db";
import { COMPETENCIES, type Competency } from "@/lib/competency";

/**
 * Progress (SPEC §8.8, §17).
 *
 * Computed from PracticeAttempt rows on every read. There is deliberately no
 * analytics table — SPEC §17 forbids one, and at MVP scale a single scan is
 * cheaper than the consistency problem a denormalized counter would create.
 */

export type CompetencyProgress = {
  competency: Competency;
  attemptCount: number;
  uniqueQuestions: number;
};

export type Progress = {
  totalAttempts: number;
  questionsPracticed: number;
  competenciesCovered: number;
  competencies: CompetencyProgress[];
};

export async function getProgress(userId: string): Promise<Progress> {
  const attempts = await db.practiceAttempt.findMany({
    where: { userId },
    select: {
      questionId: true,
      question: { select: { competency: true } },
    },
  });

  const questionsByCompetency = new Map<Competency, Set<string>>();
  const countsByCompetency = new Map<Competency, number>();
  const allQuestions = new Set<string>();

  for (const attempt of attempts) {
    const competency = attempt.question.competency as Competency;
    allQuestions.add(attempt.questionId);
    countsByCompetency.set(
      competency,
      (countsByCompetency.get(competency) ?? 0) + 1,
    );
    let questions = questionsByCompetency.get(competency);
    if (!questions) {
      questions = new Set();
      questionsByCompetency.set(competency, questions);
    }
    questions.add(attempt.questionId);
  }

  // Every competency appears, including the untouched ones — the zeros are the
  // point of this page (SPEC §8.8: "What am I neglecting?").
  const competencies = COMPETENCIES.map((competency) => ({
    competency,
    attemptCount: countsByCompetency.get(competency) ?? 0,
    uniqueQuestions: questionsByCompetency.get(competency)?.size ?? 0,
  }));

  return {
    totalAttempts: attempts.length,
    questionsPracticed: allQuestions.size,
    competenciesCovered: competencies.filter((c) => c.attemptCount > 0).length,
    competencies,
  };
}
