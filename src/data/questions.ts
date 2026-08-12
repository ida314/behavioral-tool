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
 * Curated behavioral question bank (53 questions).
 *
 * Distribution per docs/SPEC.md §9:
 *   Teamwork 6 · Conflict 6 · Leadership 5 · Failure 5 · Ambiguity 5
 *   Communication 5 · Technical Challenge 6 · Learning 5 · Time Management 5 · Feedback 5
 *
 * Wording targets entry-level candidates, so prompts accept experience from class
 * projects, hackathons, clubs, research, and part-time work — not just full-time jobs.
 */
export const questions: SeedQuestion[] = [
  // ── Teamwork ──────────────────────────────────────────────────────────────
  {
    id: "q_teamwork_01",
    text: "Tell me about a time you worked with a team to accomplish a goal.",
    competency: "TEAMWORK",
  },
  {
    id: "q_teamwork_02",
    text: "Describe a time you worked with someone whose working style was very different from yours.",
    competency: "TEAMWORK",
  },
  {
    id: "q_teamwork_03",
    text: "Tell me about a time a teammate was not contributing their share. What did you do?",
    competency: "TEAMWORK",
  },
  {
    id: "q_teamwork_04",
    text: "Describe a time you helped a teammate who was stuck.",
    competency: "TEAMWORK",
  },
  {
    id: "q_teamwork_05",
    text: "Tell me about a project where the team had to divide up unfamiliar work. How did you decide who did what?",
    competency: "TEAMWORK",
  },
  {
    id: "q_teamwork_06",
    text: "Describe a time you had to build trust quickly with people you had just met.",
    competency: "TEAMWORK",
  },

  // ── Conflict ──────────────────────────────────────────────────────────────
  {
    id: "q_conflict_01",
    text: "Tell me about a time you disagreed with a teammate.",
    competency: "CONFLICT",
  },
  {
    id: "q_conflict_02",
    text: "Describe a disagreement you had with a manager, professor, or mentor. How did you handle it?",
    competency: "CONFLICT",
  },
  {
    id: "q_conflict_03",
    text: "Tell me about a time you pushed back on a technical decision you thought was wrong.",
    competency: "CONFLICT",
  },
  {
    id: "q_conflict_04",
    text: "Describe a situation where two people on your team disagreed and you were caught in the middle.",
    competency: "CONFLICT",
  },
  {
    id: "q_conflict_05",
    text: "Tell me about a time you lost an argument at work or school. How did you respond?",
    competency: "CONFLICT",
  },
  {
    id: "q_conflict_06",
    text: "Describe a time you had to tell someone something they did not want to hear.",
    competency: "CONFLICT",
  },

  // ── Leadership ────────────────────────────────────────────────────────────
  {
    id: "q_leadership_01",
    text: "Tell me about a time you took the lead on something without being asked.",
    competency: "LEADERSHIP",
  },
  {
    id: "q_leadership_02",
    text: "Describe a time you had to motivate a group that was losing momentum.",
    competency: "LEADERSHIP",
  },
  {
    id: "q_leadership_03",
    text: "Tell me about a time you made a decision for a group without full agreement.",
    competency: "LEADERSHIP",
  },
  {
    id: "q_leadership_04",
    text: "Describe a time you mentored or taught someone.",
    competency: "LEADERSHIP",
  },
  {
    id: "q_leadership_05",
    text: "Tell me about a time you took responsibility for something that went wrong on your team.",
    competency: "LEADERSHIP",
  },

  // ── Failure ───────────────────────────────────────────────────────────────
  {
    id: "q_failure_01",
    text: "Tell me about a time you made a mistake.",
    competency: "FAILURE",
  },
  {
    id: "q_failure_02",
    text: "Describe a project that did not go the way you planned. What happened?",
    competency: "FAILURE",
  },
  {
    id: "q_failure_03",
    text: "Tell me about a time you missed a deadline or a commitment.",
    competency: "FAILURE",
  },
  {
    id: "q_failure_04",
    text: "Describe a time you shipped something with a bug that other people ran into.",
    competency: "FAILURE",
  },
  {
    id: "q_failure_05",
    text: "Tell me about a time your work was rejected or fell far short of expectations. What did you do next?",
    competency: "FAILURE",
  },

  // ── Ambiguity ─────────────────────────────────────────────────────────────
  {
    id: "q_ambiguity_01",
    text: "Tell me about a time you had to start work without clear requirements.",
    competency: "AMBIGUITY",
  },
  {
    id: "q_ambiguity_02",
    text: "Describe a time the goal of a project changed partway through.",
    competency: "AMBIGUITY",
  },
  {
    id: "q_ambiguity_03",
    text: "Tell me about a decision you had to make without enough information.",
    competency: "AMBIGUITY",
  },
  {
    id: "q_ambiguity_04",
    text: "Describe a time you were handed a problem you had no idea how to approach.",
    competency: "AMBIGUITY",
  },
  {
    id: "q_ambiguity_05",
    text: "Tell me about a time you had to choose between several reasonable options with no obviously correct answer.",
    competency: "AMBIGUITY",
  },

  // ── Communication ─────────────────────────────────────────────────────────
  {
    id: "q_communication_01",
    text: "Tell me about a time you explained something technical to a non-technical audience.",
    competency: "COMMUNICATION",
  },
  {
    id: "q_communication_02",
    text: "Describe a time a misunderstanding caused a problem. How did you resolve it?",
    competency: "COMMUNICATION",
  },
  {
    id: "q_communication_03",
    text: "Tell me about a presentation or demo you gave. How did you prepare for it?",
    competency: "COMMUNICATION",
  },
  {
    id: "q_communication_04",
    text: "Describe a time you convinced someone to adopt your idea.",
    competency: "COMMUNICATION",
  },
  {
    id: "q_communication_05",
    text: "Tell me about a time you had to communicate a delay or bad news to someone depending on you.",
    competency: "COMMUNICATION",
  },

  // ── Technical Challenge ───────────────────────────────────────────────────
  {
    id: "q_technical_challenge_01",
    text: "Tell me about the most difficult technical problem you have solved.",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_02",
    text: "Describe a bug that took you a long time to track down. How did you eventually find it?",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_03",
    text: "Tell me about a time you had to work in an unfamiliar codebase or technology.",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_04",
    text: "Describe a time you improved the performance or reliability of something you built.",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_05",
    text: "Tell me about a technical tradeoff you made and why you made it.",
    competency: "TECHNICAL_CHALLENGE",
  },
  {
    id: "q_technical_challenge_06",
    text: "Describe a time you had to debug a problem you could not reproduce.",
    competency: "TECHNICAL_CHALLENGE",
  },

  // ── Learning ──────────────────────────────────────────────────────────────
  {
    id: "q_learning_01",
    text: "Tell me about a time you had to learn a new technology quickly.",
    competency: "LEARNING",
  },
  {
    id: "q_learning_02",
    text: "Describe something significant you taught yourself outside of class or work.",
    competency: "LEARNING",
  },
  {
    id: "q_learning_03",
    text: "Tell me about a time you realized you did not know enough to finish something. What did you do?",
    competency: "LEARNING",
  },
  {
    id: "q_learning_04",
    text: "Describe a time you changed your mind about how something should be built.",
    competency: "LEARNING",
  },
  {
    id: "q_learning_05",
    text: "Tell me about a skill you deliberately worked to improve over time.",
    competency: "LEARNING",
  },

  // ── Time Management ───────────────────────────────────────────────────────
  {
    id: "q_time_management_01",
    text: "Tell me about a time you had to juggle several competing priorities.",
    competency: "TIME_MANAGEMENT",
  },
  {
    id: "q_time_management_02",
    text: "Describe a time you were under a tight deadline. How did you handle it?",
    competency: "TIME_MANAGEMENT",
  },
  {
    id: "q_time_management_03",
    text: "Tell me about a time you had to cut scope to finish something on time.",
    competency: "TIME_MANAGEMENT",
  },
  {
    id: "q_time_management_04",
    text: "Describe a time you took on too much. What happened?",
    competency: "TIME_MANAGEMENT",
  },
  {
    id: "q_time_management_05",
    text: "Tell me how you planned a project with a hard deadline, such as a hackathon or a final submission.",
    competency: "TIME_MANAGEMENT",
  },

  // ── Feedback ──────────────────────────────────────────────────────────────
  {
    id: "q_feedback_01",
    text: "Tell me about a time you received critical feedback. How did you respond?",
    competency: "FEEDBACK",
  },
  {
    id: "q_feedback_02",
    text: "Describe a time you gave someone feedback that was difficult to deliver.",
    competency: "FEEDBACK",
  },
  {
    id: "q_feedback_03",
    text: "Tell me about a code review where your work was significantly challenged.",
    competency: "FEEDBACK",
  },
  {
    id: "q_feedback_04",
    text: "Describe a piece of feedback that changed how you work.",
    competency: "FEEDBACK",
  },
  {
    id: "q_feedback_05",
    text: "Tell me about a time you asked for feedback before anyone offered it.",
    competency: "FEEDBACK",
  },
];
