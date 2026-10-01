"use client";

import { useState, useTransition } from "react";
import { saveFeedbackPromptTemplate } from "@/lib/actions/feedback-prompt";
import {
  DEFAULT_FEEDBACK_PROMPT_TEMPLATE,
  FEEDBACK_PROMPT_PLACEHOLDERS,
} from "@/lib/feedback-prompt";
import { FEEDBACK_PROMPT_MAX } from "@/lib/validation";

/** Edits the "Copy LLM prompt" template. A failed save keeps the text in the box. */
export function FeedbackPromptEditor({ initial }: { initial: string }) {
  const [template, setTemplate] = useState(initial);
  const [status, setStatus] = useState<
    { kind: "saved" } | { kind: "error"; message: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setStatus(null);
    startTransition(async () => {
      try {
        const result = await saveFeedbackPromptTemplate(template);
        setStatus(
          result.ok ? { kind: "saved" } : { kind: "error", message: result.error },
        );
      } catch {
        setStatus({
          kind: "error",
          message: "Something went wrong while saving the prompt.",
        });
      }
    });
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        handleSave();
      }}
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Placeholders, filled in when you copy:{" "}
        {FEEDBACK_PROMPT_PLACEHOLDERS.map((name, index) => (
          <span key={name}>
            {index > 0 ? ", " : ""}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs dark:bg-zinc-800">
              {`{{${name}}}`}
            </code>
          </span>
        ))}
        . <code className="text-xs">{"{{ideal_response}}"}</code> is the story you
        selected for the attempt, or blank if none.
      </p>

      <textarea
        aria-label="Prompt template"
        value={template}
        maxLength={FEEDBACK_PROMPT_MAX}
        onChange={(event) => {
          setTemplate(event.target.value);
          setStatus(null);
        }}
        rows={22}
        className="mt-4 w-full resize-y rounded-md border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm leading-relaxed dark:border-zinc-700"
      />

      {status?.kind === "error" ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || template.trim().length === 0}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {status?.kind === "saved" ? (
          <span className="text-sm text-zinc-500 dark:text-zinc-400">Saved</span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setTemplate(DEFAULT_FEEDBACK_PROMPT_TEMPLATE);
            setStatus(null);
          }}
          className="ml-auto text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Reset to default
        </button>
      </div>
    </form>
  );
}
