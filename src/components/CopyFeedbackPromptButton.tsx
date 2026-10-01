"use client";

import { useState } from "react";

/**
 * Copies a ready-made "critique my answer" prompt for pasting into an LLM.
 *
 * The prompt is built on the server (src/lib/feedback-prompt.ts); this only
 * puts it on the clipboard.
 */
export function CopyFeedbackPromptButton({ prompt }: { prompt: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await copyText(prompt);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {status === "copied"
        ? "Copied!"
        : status === "failed"
          ? "Copy failed"
          : "Copy LLM prompt"}
    </button>
  );
}

// navigator.clipboard only exists in a secure context, which a homelab served
// over plain http on the LAN is not — fall back to the legacy selection copy.
async function copyText(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  if (!ok) throw new Error("copy failed");
}
