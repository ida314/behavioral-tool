"use client";

import { useRouter } from "next/navigation";
import {
  COMPETENCIES,
  competencyLabel,
  type Competency,
} from "@/lib/competency";

/**
 * Filter state lives in the URL, so it survives a refresh and can be linked to
 * (the Progress page links straight into a filtered practice list).
 *
 * The current value arrives as a prop from the server page rather than from
 * `useSearchParams()` — one less client hook, and no Suspense boundary needed.
 */
export function CompetencyFilter({
  value,
  basePath,
  label = "Competency",
}: {
  value: Competency | null;
  basePath: string;
  label?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="competency" className="text-sm text-zinc-500">
        {label}
      </label>
      <select
        id="competency"
        value={value ?? ""}
        onChange={(event) => {
          const next = event.target.value;
          // Dropping `pick` means changing the filter also re-rolls the featured
          // question instead of leaving a stale index behind.
          router.push(next ? `${basePath}?competency=${next}` : basePath);
        }}
        className="rounded-md border border-zinc-300 bg-transparent px-3 py-1.5 text-sm dark:border-zinc-700"
      >
        <option value="">All competencies</option>
        {COMPETENCIES.map((competency) => (
          <option key={competency} value={competency}>
            {competencyLabel(competency)}
          </option>
        ))}
      </select>
    </div>
  );
}
