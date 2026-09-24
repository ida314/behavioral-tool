/**
 * The competency vocabulary, kept free of any server/Prisma import so it is safe
 * to use in client components (filter dropdowns, badges).
 *
 * These string values must stay identical to the `Competency` enum in
 * prisma/schema.prisma. Changing one without the other is a migration.
 */
export const COMPETENCIES = [
  "TEAMWORK",
  "CONFLICT",
  "LEADERSHIP",
  "FAILURE",
  "AMBIGUITY",
  "COMMUNICATION",
  "TECHNICAL_CHALLENGE",
  "LEARNING",
  "TIME_MANAGEMENT",
  "FEEDBACK",
  "MOTIVATION",
] as const;

export type Competency = (typeof COMPETENCIES)[number];

export const COMPETENCY_LABELS: Record<Competency, string> = {
  TEAMWORK: "Teamwork",
  CONFLICT: "Conflict",
  LEADERSHIP: "Leadership",
  FAILURE: "Failure",
  AMBIGUITY: "Ambiguity",
  COMMUNICATION: "Communication",
  TECHNICAL_CHALLENGE: "Technical Challenge",
  LEARNING: "Learning",
  TIME_MANAGEMENT: "Time Management",
  FEEDBACK: "Feedback",
  MOTIVATION: "Motivation & Fit",
};

export function isCompetency(value: unknown): value is Competency {
  return (
    typeof value === "string" && (COMPETENCIES as readonly string[]).includes(value)
  );
}

export function competencyLabel(competency: Competency): string {
  return COMPETENCY_LABELS[competency];
}
