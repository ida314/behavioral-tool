"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CompetencyBadge } from "@/components/CompetencyBadge";
import { PracticeTimer, elapsedSeconds } from "@/components/PracticeTimer";
import { StorySelector } from "@/components/StorySelector";
import { createAttempt } from "@/lib/actions/attempts";
import { track } from "@/lib/analytics";
import { REFLECTION_MAX, RESPONSE_MAX } from "@/lib/validation";
import type { StoryOption } from "@/lib/queries/stories";
import type { QuestionRecord } from "@/lib/queries/questions";

/**
 * The practice session (SPEC §8.3) and the save panel (SPEC §8.4) as two stages
 * of one client component (ADR-006).
 *
 * The invariant this file exists to protect: **the user's response lives in this
 * component's state and is never cleared, remounted, or navigated away from until
 * a save has actually succeeded** (SPEC §24). Losing a multi-paragraph interview
 * answer is the worst bug this app can have, so the save action returns failures
 * rather than throwing or redirecting, and both stages keep the same state.
 */
export function PracticeEditor({
  question,
  stories,
}: {
  question: QuestionRecord;
  stories: StoryOption[];
}) {
  const router = useRouter();

  const [stage, setStage] = useState<"editing" | "saving">("editing");
  const [response, setResponse] = useState("");
  const [reflection, setReflection] = useState("");
  const [storyId, setStoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Lazy initializer, evaluated once. The start time is never rendered directly
  // — the timer's first frame reads 00:00 either way — so the server's clock and
  // the client's disagreeing here cannot produce a hydration mismatch.
  const [startedAt] = useState(() => Date.now());

  // Frozen when the user clicks Finish, so time spent filling in the save panel
  // is not counted as practice time.
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);

  const savedRef = useRef(false);
  const startTrackedRef = useRef(false);

  useEffect(() => {
    if (startTrackedRef.current) return;
    startTrackedRef.current = true;
    track("practice_started", { questionId: question.id });
  }, [question.id]);

  // A refresh or a stray back-navigation would take the answer with it.
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) {
      if (savedRef.current || response.trim().length === 0) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [response]);

  function handleFinish() {
    setDurationSeconds(elapsedSeconds(startedAt));
    track("practice_completed", {
      questionId: question.id,
      responseLength: response.length,
    });
    setStage("saving");
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await createAttempt({
          questionId: question.id,
          response,
          storyId,
          reflection,
          durationSeconds: durationSeconds ?? undefined,
        });

        if (!result.ok) {
          setError(result.error);
          return;
        }

        track("attempt_saved", {
          questionId: question.id,
          attemptId: result.data.attemptId,
          durationSeconds: durationSeconds ?? null,
        });
        savedRef.current = true;
        router.push(`/attempts/${result.data.attemptId}`);
      } catch {
        // Network failure, action transport error — anything that rejects. The
        // response is still in state, which is the whole point.
        setError("Something went wrong while saving your response.");
      }
    });
  }

  return (
    <div>
      <CompetencyBadge competency={question.competency} />
      <h1 className="mt-3 text-xl leading-snug font-medium text-balance">
        {question.text}
      </h1>

      {/* Both stages stay mounted so `response` is never re-initialized. */}
      <div className={stage === "editing" ? "mt-6" : "hidden"}>
        <label htmlFor="response" className="sr-only">
          Your response
        </label>
        <textarea
          id="response"
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          maxLength={RESPONSE_MAX}
          rows={16}
          autoFocus
          placeholder="Talk through the situation, what you did, and how it turned out."
          className="w-full resize-y rounded-lg border border-zinc-300 bg-transparent p-4 leading-relaxed focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:focus:border-zinc-500"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <PracticeTimer startedAt={startedAt} />
          <button
            type="button"
            onClick={handleFinish}
            disabled={response.trim().length === 0}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Finish Practice
          </button>
        </div>
      </div>

      {stage === "saving" ? (
        <div className="mt-6 space-y-6">
          <section>
            <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Your Response
            </h2>
            <p className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 p-4 leading-relaxed whitespace-pre-wrap dark:border-zinc-800">
              {response}
            </p>
            <button
              type="button"
              onClick={() => setStage("editing")}
              className="mt-2 text-sm text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Back to editing
            </button>
          </section>

          <StorySelector
            stories={stories}
            selectedStoryId={storyId}
            onSelect={setStoryId}
          />

          <section>
            <label
              htmlFor="reflection"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Reflection{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </label>
            <textarea
              id="reflection"
              value={reflection}
              onChange={(event) => setReflection(event.target.value)}
              maxLength={REFLECTION_MAX}
              rows={3}
              placeholder="What would you do differently next time?"
              className="mt-2 w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 text-sm dark:border-zinc-700"
            />
          </section>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950"
            >
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className="mt-3 rounded-md border border-red-400 px-3 py-1.5 font-medium text-red-700 disabled:opacity-40 dark:border-red-800 dark:text-red-300"
              >
                Try Again
              </button>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {pending ? "Saving…" : "Save Attempt"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
