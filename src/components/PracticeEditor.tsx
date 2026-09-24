"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CompetencyBadge } from "@/components/CompetencyBadge";
import { PracticeTimer, elapsedSeconds } from "@/components/PracticeTimer";
import { StorySelector } from "@/components/StorySelector";
import { AudioRecorder, type Recording } from "@/components/AudioRecorder";
import { createAttempt, createAudioAttempt } from "@/lib/actions/attempts";
import { transcribeRecording } from "@/lib/actions/transcribe";
import { track } from "@/lib/analytics";
import { REFLECTION_MAX, RESPONSE_MAX } from "@/lib/validation";
import {
  CONFIDENCES,
  CONFIDENCE_OPTIONS,
  formatInterval,
  type Confidence,
} from "@/lib/review";
import type { StoryOption } from "@/lib/queries/stories";
import type { QuestionRecord } from "@/lib/queries/questions";

/**
 * The practice session (SPEC §8.3) and the save panel (SPEC §8.4) as two stages
 * of one client component (ADR-006), for a typed or a spoken answer (ADR-010).
 *
 * The invariant this file exists to protect: **the user's work — the response
 * text and the recording alike — lives in this component's state and is never
 * cleared, remounted, or navigated away from until a save has actually
 * succeeded** (SPEC §24). Both save actions return failures rather than throwing
 * or redirecting, so nothing here unmounts on a bad save. A recording is if
 * anything more precious than typed text: the user cannot retype a take.
 */
export function PracticeEditor({
  question,
  stories,
  intervals,
}: {
  question: QuestionRecord;
  stories: StoryOption[];
  /** Days until this question comes back under each rating (ADR-011). */
  intervals: Record<Confidence, number>;
}) {
  const router = useRouter();

  const [stage, setStage] = useState<"editing" | "saving">("editing");
  const [mode, setMode] = useState<"type" | "speak">("type");
  const [response, setResponse] = useState("");
  const [reflection, setReflection] = useState("");
  const [storyId, setStoryId] = useState("");
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  // Held back when filling the textarea would overwrite text the user wrote.
  const [pendingTranscript, setPendingTranscript] = useState<string | null>(null);

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
      if (savedRef.current) return;
      if (response.trim().length === 0 && !recording) return;
      event.preventDefault();
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [response, recording]);

  function applyTranscript(text: string) {
    setResponse(text);
    setPendingTranscript(null);
  }

  async function handleRecorded(next: Recording) {
    setRecording(next);
    setTranscribeError(null);
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", next.blob, "recording");

      const result = await transcribeRecording(formData);
      if (!result.ok) {
        setTranscribeError(result.error);
        return;
      }

      track("recording_transcribed", {
        questionId: question.id,
        seconds: next.seconds,
        bytes: next.blob.size,
      });
      setTranscript(result.data.transcript);

      // Only auto-fill when nothing would be lost: an empty box, or one still
      // holding the previous transcript untouched. Otherwise let the user choose.
      if (response.trim().length === 0 || response === transcript) {
        applyTranscript(result.data.transcript);
      } else {
        setPendingTranscript(result.data.transcript);
      }
    } catch {
      setTranscribeError(
        "Something went wrong while transcribing your recording. Your recording is safe — you can save it and type the text yourself.",
      );
    } finally {
      setTranscribing(false);
    }
  }

  function handleDiscardRecording() {
    setRecording(null);
    setTranscript(null);
    setTranscribeError(null);
    setPendingTranscript(null);
  }

  function handleFinish() {
    setDurationSeconds(elapsedSeconds(startedAt));
    track("practice_completed", {
      questionId: question.id,
      responseLength: response.length,
      spoken: recording !== null,
    });
    setStage("saving");
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        // A recording is saved whenever one exists, regardless of which input
        // mode is on screen — switching back to typing must not silently throw
        // away a take the user already made.
        const result = recording
          ? await createAudioAttempt(
              buildAudioFormData({
                questionId: question.id,
                response,
                transcript,
                storyId,
                reflection,
                confidence,
                durationSeconds,
                recording,
              }),
            )
          : await createAttempt({
              questionId: question.id,
              response,
              storyId,
              reflection,
              confidence: confidence ?? undefined,
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
          responseType: recording ? "AUDIO" : "TEXT",
        });
        savedRef.current = true;
        router.push(`/attempts/${result.data.attemptId}`);
      } catch {
        // Network failure, action transport error, an upload over the body size
        // limit — anything that rejects. The response and the recording are both
        // still in state, which is the whole point.
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
        <div className="flex gap-1 rounded-md border border-zinc-200 p-1 text-sm dark:border-zinc-800">
          <ModeButton
            active={mode === "type"}
            onClick={() => setMode("type")}
            label="Type"
          />
          <ModeButton
            active={mode === "speak"}
            onClick={() => setMode("speak")}
            label="Speak"
          />
        </div>

        {mode === "speak" ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Answer out loud, the way you would in the interview. The recording
              is transcribed on this machine and both are saved.
            </p>

            <AudioRecorder
              recording={recording}
              onRecorded={handleRecorded}
              onDiscard={handleDiscardRecording}
              disabled={transcribing || pending}
            />

            {transcribing ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Transcribing your recording…
              </p>
            ) : null}

            {transcribeError ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {transcribeError}
              </p>
            ) : null}

            {pendingTranscript ? (
              <div className="rounded-md border border-zinc-300 p-4 text-sm dark:border-zinc-700">
                <p className="font-medium">
                  Transcript ready — your typed text was left alone.
                </p>
                <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                  {pendingTranscript}
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => applyTranscript(pendingTranscript)}
                    className="font-medium underline underline-offset-4"
                  >
                    Replace my text
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      applyTranscript(`${response}\n\n${pendingTranscript}`)
                    }
                    className="font-medium underline underline-offset-4"
                  >
                    Append
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingTranscript(null)}
                    className="text-zinc-500 dark:text-zinc-400"
                  >
                    Keep mine
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4">
          <label
            htmlFor="response"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            {recording ? "Transcript — edit anything it got wrong" : "Your response"}
          </label>
          <textarea
            id="response"
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            maxLength={RESPONSE_MAX}
            rows={mode === "speak" ? 10 : 16}
            autoFocus={mode === "type"}
            placeholder="Talk through the situation, what you did, and how it turned out."
            className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-transparent p-4 leading-relaxed focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:focus:border-zinc-500"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <PracticeTimer startedAt={startedAt} />
          <button
            type="button"
            onClick={handleFinish}
            disabled={response.trim().length === 0 || transcribing}
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
            {recording ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Your recording will be saved with it.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setStage("editing")}
              className="mt-2 text-sm text-zinc-500 hover:underline dark:text-zinc-400"
            >
              Back to editing
            </button>
          </section>

          <fieldset>
            <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              How did telling it feel?{" "}
              <span className="font-normal text-zinc-500">(optional)</span>
            </legend>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Rate the telling, not the story. It decides when this question
              comes back.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {CONFIDENCES.map((option) => (
                <ConfidenceButton
                  key={option}
                  selected={confidence === option}
                  onClick={() =>
                    setConfidence(confidence === option ? null : option)
                  }
                  label={CONFIDENCE_OPTIONS[option].label}
                  hint={CONFIDENCE_OPTIONS[option].hint}
                  when={formatInterval(intervals[option])}
                />
              ))}
            </div>
          </fieldset>

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

function ModeButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "flex-1 rounded bg-zinc-900 px-3 py-1.5 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          : "flex-1 rounded px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
      }
    >
      {label}
    </button>
  );
}

function ConfidenceButton({
  selected,
  onClick,
  label,
  hint,
  when,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  hint: string;
  when: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-md border px-3 py-2.5 text-left text-sm ${
        selected
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      }`}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className={selected ? "text-xs opacity-80" : "text-xs text-zinc-500"}>
          {when}
        </span>
      </span>
      <span
        className={`mt-0.5 block text-xs ${selected ? "opacity-80" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        {hint}
      </span>
    </button>
  );
}

function buildAudioFormData({
  questionId,
  response,
  transcript,
  storyId,
  reflection,
  confidence,
  durationSeconds,
  recording,
}: {
  questionId: string;
  response: string;
  transcript: string | null;
  storyId: string;
  reflection: string;
  confidence: Confidence | null;
  durationSeconds: number | null;
  recording: Recording;
}): FormData {
  const formData = new FormData();
  formData.append("questionId", questionId);
  formData.append("response", response);
  formData.append("transcript", transcript ?? "");
  formData.append("storyId", storyId);
  formData.append("reflection", reflection);
  formData.append("confidence", confidence ?? "");
  formData.append(
    "durationSeconds",
    durationSeconds == null ? "" : String(durationSeconds),
  );
  formData.append("audio", recording.blob, "recording");
  return formData;
}
