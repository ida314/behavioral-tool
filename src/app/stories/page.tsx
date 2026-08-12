import { DeleteStoryButton } from "@/components/DeleteStoryButton";
import { EmptyState } from "@/components/EmptyState";
import { StoryForm } from "@/components/StoryForm";
import { requireUser } from "@/lib/auth";
import { listStories } from "@/lib/queries/stories";

/** Stories (SPEC §8.7) — lightweight, reusable experiences. */
export default async function StoriesPage() {
  const user = await requireUser();
  const stories = await listStories(user.id);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Stories</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        Experiences you can reuse across different behavioral questions.
      </p>

      <div className="mt-6">
        <StoryForm />
      </div>

      <div className="mt-8">
        {stories.length === 0 ? (
          <EmptyState message="You haven't created any stories yet. Stories are experiences you can reuse across different behavioral questions." />
        ) : (
          <ul className="space-y-3">
            {stories.map((story) => (
              <li
                key={story.id}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
              >
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-medium">{story.title}</h2>
                  <DeleteStoryButton
                    storyId={story.id}
                    attemptCount={story.attemptCount}
                  />
                </div>

                {story.description ? (
                  <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                    {story.description}
                  </p>
                ) : null}

                <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                  Used in {story.attemptCount} practice{" "}
                  {story.attemptCount === 1 ? "attempt" : "attempts"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
