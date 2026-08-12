"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createStory } from "@/lib/actions/stories";
import { track } from "@/lib/analytics";
import { STORY_DESCRIPTION_MAX, STORY_TITLE_MAX } from "@/lib/validation";

/** Create a story from /stories (SPEC §8.7). The inline version lives in StorySelector. */
export function StoryForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createStory({ title, description });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        track("story_created", { storyId: result.data.id });
        setTitle("");
        setDescription("");
        router.refresh();
      } catch {
        setError("Something went wrong while saving the story.");
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
      className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      <div>
        <label htmlFor="title" className="block text-sm font-medium">
          Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          maxLength={STORY_TITLE_MAX}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Distributed Systems Group Project"
          className="mt-1.5 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium">
          Description{" "}
          <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          maxLength={STORY_DESCRIPTION_MAX}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="Worked with three classmates to build a fault-tolerant key-value store."
          className="mt-1.5 w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        />
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={pending || title.trim().length === 0}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : "Create Story"}
      </button>
    </form>
  );
}
