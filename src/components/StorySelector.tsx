"use client";

import { useState, useTransition } from "react";
import { createStory } from "@/lib/actions/stories";
import { track } from "@/lib/analytics";
import { STORY_TITLE_MAX, STORY_DESCRIPTION_MAX } from "@/lib/validation";
import type { StoryOption } from "@/lib/queries/stories";

/**
 * SPEC §8.4 — select an existing story *or* create one inline.
 *
 * Creating happens here rather than on /stories because navigating away mid-save
 * would discard the user's answer, which SPEC §24 forbids.
 */
export function StorySelector({
  stories,
  selectedStoryId,
  onSelect,
}: {
  stories: StoryOption[];
  selectedStoryId: string;
  onSelect: (storyId: string) => void;
}) {
  const [options, setOptions] = useState(stories);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createStory({ title, description });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        track("story_created", { storyId: result.data.id });
        setOptions((current) => [result.data, ...current]);
        onSelect(result.data.id);
        setTitle("");
        setDescription("");
        setCreating(false);
      } catch {
        setError("Something went wrong while saving the story.");
      }
    });
  }

  return (
    <div>
      <label
        htmlFor="story"
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        Story used <span className="font-normal text-zinc-500">(optional)</span>
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <select
          id="story"
          value={selectedStoryId}
          onChange={(event) => onSelect(event.target.value)}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
        >
          <option value="">No story</option>
          {options.map((story) => (
            <option key={story.id} value={story.id}>
              {story.title}
            </option>
          ))}
        </select>

        {!creating ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            + Create New Story
          </button>
        ) : null}
      </div>

      {creating ? (
        <div className="mt-3 space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <input
            type="text"
            value={title}
            maxLength={STORY_TITLE_MAX}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Distributed Systems Group Project"
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />
          <textarea
            value={description}
            maxLength={STORY_DESCRIPTION_MAX}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What happened, in a sentence or two."
            rows={3}
            className="w-full rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
          />

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCreate}
              disabled={pending || title.trim().length === 0}
              className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pending ? "Saving…" : "Save Story"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreating(false);
                setError(null);
              }}
              className="text-sm text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
