"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatClock } from "@/lib/format";
import { MAX_AUDIO_BYTES, formatBytes } from "@/lib/audio";

export type Recording = {
  blob: Blob;
  mimeType: string;
  /** Wall-clock length of the recording, in seconds. */
  seconds: number;
};

type Status = "idle" | "recording" | "done";

/**
 * Microphone capture via MediaRecorder (ADR-010).
 *
 * The component owns the recorder and the blob; the parent owns what happens
 * next. It never discards a finished recording on its own — re-recording is an
 * explicit user action, because a lost take is a lost answer.
 */
export function AudioRecorder({
  recording,
  onRecorded,
  onDiscard,
  disabled = false,
}: {
  recording: Recording | null;
  onRecorded: (recording: Recording) => void;
  onDiscard: () => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>(recording ? "done" : "idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);

  // Derived from the blob rather than stored, so there is no stale-URL window.
  const previewUrl = useMemo(
    () => (recording ? URL.createObjectURL(recording.blob) : null),
    [recording],
  );

  // Object URLs leak until revoked, and a long practice session can make many.
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    if (status !== "recording") return;
    const interval = setInterval(
      () => setElapsed(Math.round((Date.now() - startedAtRef.current) / 1000)),
      500,
    );
    return () => clearInterval(interval);
  }, [status]);

  // Releasing the mic matters: browsers show a recording indicator until every
  // track is stopped, and an abandoned stream keeps it lit.
  useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, pickMimeType());

      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stream.getTracks().forEach((track) => track.stop());
        setStatus("done");

        if (blob.size === 0) {
          setError("That recording came out empty. Check your microphone.");
          setStatus("idle");
          return;
        }
        if (blob.size > MAX_AUDIO_BYTES) {
          setError(
            `That recording is ${formatBytes(blob.size)}, over the ${formatBytes(MAX_AUDIO_BYTES)} limit. Try a shorter take.`,
          );
          setStatus("idle");
          return;
        }

        onRecorded({
          blob,
          mimeType,
          seconds: Math.round((Date.now() - startedAtRef.current) / 1000),
        });
      };

      startedAtRef.current = Date.now();
      setElapsed(0);
      recorder.start();
      recorderRef.current = recorder;
      setStatus("recording");
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in your browser settings, or switch to typing."
          : "This browser could not start a recording. You can type your answer instead.",
      );
    }
  }

  function stop() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-3">
        {status === "recording" ? (
          <>
            <button
              type="button"
              onClick={stop}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Stop Recording
            </button>
            <span
              className="flex items-center gap-2 text-sm tabular-nums text-zinc-600 dark:text-zinc-400"
              aria-live="polite"
            >
              <span className="inline-block size-2 animate-pulse rounded-full bg-red-600" />
              Recording {formatClock(elapsed)}
            </span>
          </>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={disabled}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            {recording ? "Record Again" : "Start Recording"}
          </button>
        )}

        {recording && status !== "recording" ? (
          <button
            type="button"
            onClick={onDiscard}
            disabled={disabled}
            className="text-sm text-zinc-500 hover:text-red-600 disabled:opacity-40 dark:text-zinc-400 dark:hover:text-red-400"
          >
            Discard
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {recording && previewUrl ? (
        <div className="mt-3">
          <audio src={previewUrl} controls className="w-full" />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {formatClock(recording.seconds)} · {formatBytes(recording.blob.size)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Chrome and Firefox produce WebM/Opus; Safari only offers MP4. Passing an
 * unsupported type throws, so probe rather than assume, and fall back to the
 * browser's own default.
 */
function pickMimeType(): MediaRecorderOptions {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const mimeType of candidates) {
    if (MediaRecorder.isTypeSupported(mimeType)) return { mimeType };
  }
  return {};
}
