import { AttemptCard } from "@/components/AttemptCard";
import { CompetencyFilter } from "@/components/CompetencyFilter";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/auth";
import { isCompetency } from "@/lib/competency";
import { listAttempts } from "@/lib/queries/attempts";

/** History (SPEC §8.5). Newest first; competency is the only required filter. */
export default async function HistoryPage(props: PageProps<"/history">) {
  const searchParams = await props.searchParams;
  const user = await requireUser();

  const raw = searchParams.competency;
  const competency =
    typeof raw === "string" && isCompetency(raw) ? raw : null;

  const attempts = await listAttempts(user.id, {
    competency: competency ?? undefined,
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">History</h1>
        <CompetencyFilter value={competency} basePath="/history" />
      </div>

      <div className="mt-6">
        {attempts.length === 0 ? (
          <EmptyState
            message={
              competency
                ? "No practice attempts for this competency yet."
                : "You haven't completed any practice attempts yet."
            }
            actionLabel="Practice Your First Question"
            actionHref="/practice"
          />
        ) : (
          <ul className="space-y-3">
            {attempts.map((attempt) => (
              <li key={attempt.id}>
                <AttemptCard attempt={attempt} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
