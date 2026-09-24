import type { Competency } from "@/lib/competency";

export type SeedQuestion = {
  /**
   * Stable, human-readable id. Deliberately not a cuid: the seed upserts on this
   * value, so re-running `npm run db:seed` never duplicates questions and never
   * orphans existing PracticeAttempt.questionId references.
   *
   * Never renumber or reuse an id. To retire a question, remove it here and leave
   * its id burned (see docs/DECISIONS.md ADR-004).
   */
  id: string;
  text: string;
  competency: Competency;
};

/**
 * Curated behavioral question bank (23 questions).
 *
 * Replaced the original 53-question bank on 2026-09-24. Those ids (up to
 * q_<competency>_05/06) are burned — the numbering below continues past them.
 *
 * Distribution:
 *   Motivation & Fit 5 · Technical Challenge 5 · Conflict 1 · Communication 1
 *   Feedback 1 · Failure 1 · Learning 2 · Time Management 2 · Ambiguity 2
 *   Leadership 1 · Teamwork 2
 */
export const questions: SeedQuestion[] = [
  // ── Motivation & Fit ──────────────────────────────────────────────────────
  {
    id: "q_motivation_01",
    text: "Tell me about yourself.",
    competency: "MOTIVATION",
  },
  {
    id: "q_motivation_02",
    text: "Why software engineering?",
    competency: "MOTIVATION",
  },
  {
    id: "q_motivation_03",
    text: "Why this company?",
    competency: "MOTIVATION",
  },
  {
    id: "q_motivation_04",
    text: "Why this role?",
    competency: "MOTIVATION",
  },
  {
    id: "q_motivation_05",
    text: "What are you looking for next?",
    competency: "MOTIVATION",
  },
  // ── Technical Challenge ───────────────────────────────────────────────────
  {
    id: "q_technical_challenge_07",
    text: "Tell me about a project you're proud of.",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_08",
    text: "Walk me through your strongest technical project.",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_09",
    text: "What's the hardest problem you've encountered?",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_10",
    text: "Tell me about a refactor or architectural change you made.",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_11",
    text: "Tell me about a time you worked in code you didn't write.",
    competency: "TECHNICAL_CHALLENGE",
  },
  // ── Conflict ──────────────────────────────────────────────────────────────
  {
    id: "q_conflict_07",
    text: "Tell me about a disagreement with a teammate.",
    competency: "CONFLICT",
  },
  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: "q_communication_06",
    text: "Tell me about a time you disagreed with a technical decision.",
    competency: "COMMUNICATION",
  },
  // ── Feedback ──────────────────────────────────────────────────────────────
  {
    id: "q_feedback_06",
    text: "Tell me about a time you received critical feedback.",
    competency: "FEEDBACK",
  },
  // ── Failure ───────────────────────────────────────────────────────────────
  {
    id: "q_failure_06",
    text: "Tell me about a mistake you made, or a time you failed.",
    competency: "FAILURE",
  },
  // ── Learning ──────────────────────────────────────────────────────────────
  {
    id: "q_learning_06",
    text: "Tell me about a time you had to learn something quickly.",
    competency: "LEARNING",
  },
  {
    id: "q_learning_07",
    text: "What's your biggest weakness?",
    competency: "LEARNING",
  },
  // ── Time Management ───────────────────────────────────────────────────────
  {
    id: "q_time_management_06",
    text: "Tell me about a time you worked under a tight deadline.",
    competency: "TIME_MANAGEMENT",
  },
  {
    id: "q_time_management_07",
    text: "Tell me about a time you had to balance competing priorities.",
    competency: "TIME_MANAGEMENT",
  },
  // ── Ambiguity ─────────────────────────────────────────────────────────────
  {
    id: "q_ambiguity_06",
    text: "Tell me about a time you worked with unclear requirements.",
    competency: "AMBIGUITY",
  },
  {
    id: "q_ambiguity_07",
    text: "Tell me about a time you had to scope a project — deciding what not to build.",
    competency: "AMBIGUITY",
  },
  // ── Leadership ────────────────────────────────────────────────────────────
  {
    id: "q_leadership_06",
    text: "Tell me about a time you took initiative.",
    competency: "LEADERSHIP",
  },
  // ── Teamwork ──────────────────────────────────────────────────────────────
  {
    id: "q_teamwork_07",
    text: "Tell me about a time you helped a teammate.",
    competency: "TEAMWORK",
  },
  {
    id: "q_teamwork_08",
    text: "What's your preferred way of working on a team?",
    competency: "TEAMWORK",
  },
];
