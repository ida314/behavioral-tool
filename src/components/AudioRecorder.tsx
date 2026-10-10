"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatClock } from "@/lib/format";
import { MAX_AUDIO_BYTES, formatBytes } from "@/lib/audio";
import { AudioPlayer } from "@/components/AudioPlayer";

export type Recording = {
  blob: Blob;
  mimeType: string;
  /** Wall-clock length of the recording, in seconds. */
  seconds: number;
};

type Status = "idle" | "recording" | "done";

/**
 * Peak amplitude below which the input counts as dead (about -80 dBFS). Even a
 * quiet room puts a working microphone well above this; a muted or wrong input
 * device delivers exact zeros.
 */
const SIGNAL_FLOOR = 1e-4;
/** How long the input may stay dead before the recorder warns about it. */
const NO_SIGNAL_WARNING_MS = 3000;

type LevelMonitor = {
  context: AudioContext;
  interval: ReturnType<typeof setInterval>;
  /** Readings taken while the context was running — zeros from a suspended one prove nothing. */
  samples: number;
  heardSignal: boolean;
  lastSignalAt: number;
};

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
  const [level, setLevel] = useState(0);
  const [noSignal, setNoSignal] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const monitorRef = useRef<LevelMonitor | null>(null);

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
      stopMonitor();
    };
  }, []);

  /**
   * Watches the live input so a muted or wrong microphone is caught while the
   * user is still talking, not after a silent take has been saved. Best effort:
   * if Web Audio is unavailable, recording proceeds unmonitored.
   */
  function startMonitor(stream: MediaStream) {
    try {
      const context = new AudioContext();
      void context.resume();
      const analyser = context.createAnalyser();
      analyser.fftSize = 2048;
      context.createMediaStreamSource(stream).connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);

      const monitor: LevelMonitor = {
        context,
        samples: 0,
        heardSignal: false,
        lastSignalAt: Date.now(),
        interval: setInterval(() => {
          if (context.state !== "running") return;
          analyser.getFloatTimeDomainData(buffer);
          let peak = 0;
          for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));

          monitor.samples += 1;
          if (peak > SIGNAL_FLOOR) {
            monitor.heardSignal = true;
            monitor.lastSignalAt = Date.now();
          }
          setLevel(levelFromPeak(peak));
          setNoSignal(Date.now() - monitor.lastSignalAt > NO_SIGNAL_WARNING_MS);
        }, 100),
      };
      monitorRef.current = monitor;
    } catch {
      monitorRef.current = null;
    }
  }

  /** Returns whether the whole take was provably silent. */
  function stopMonitor(): boolean {
    const monitor = monitorRef.current;
    monitorRef.current = null;
    setLevel(0);
    setNoSignal(false);
    if (!monitor) return false;
    clearInterval(monitor.interval);
    void monitor.context.close();
    return monitor.samples > 0 && !monitor.heardSignal;
  }

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
        const silent = stopMonitor();
        setStatus("done");

        // A take of pure digital silence is not an answer, and whisper would
        // invent a transcript for it. Refuse it while the user can still re-record.
        if (silent) {
          setError(
            "That recording was completely silent — no sound reached the microphone. Check that the right input device is selected and not muted, then record again.",
          );
          setStatus("idle");
          return;
        }
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
      startMonitor(stream);
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
            <span
              className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              role="meter"
              aria-label="Microphone level"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(level * 100)}
            >
              <span
                className="block h-full bg-emerald-500 transition-[width] duration-100"
                style={{ width: `${level * 100}%` }}
              />
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

      {status === "recording" && noSignal ? (
        <p
          className="mt-3 text-sm text-amber-700 dark:text-amber-400"
          role="alert"
        >
          No sound is reaching the microphone. Check that the right input device
          is selected and not muted — this take is recording silence.
        </p>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {recording && previewUrl ? (
        <div className="mt-3">
          <AudioPlayer src={previewUrl} />
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            {formatClock(recording.seconds)} · {formatBytes(recording.blob.size)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Maps a peak amplitude onto 0–1 across -60…0 dBFS, the range speech occupies. */
function levelFromPeak(peak: number): number {
  if (peak <= 0) return 0;
  const db = 20 * Math.log10(peak);
  return Math.min(1, Math.max(0, (db + 60) / 60));
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
