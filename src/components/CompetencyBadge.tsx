import { competencyLabel, type Competency } from "@/lib/competency";

/** One neutral style for all ten competencies — no per-competency palette to maintain. */
export function CompetencyBadge({ competency }: { competency: Competency }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-300 px-2.5 py-0.5 text-xs font-medium tracking-wide text-zinc-600 uppercase dark:border-zinc-700 dark:text-zinc-400">
      {competencyLabel(competency)}
    </span>
  );
}
