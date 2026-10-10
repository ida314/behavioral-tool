"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";

/**
 * A pausable clock. Resuming shifts `startedAt` forward by the time spent
 * paused, so elapsed time is always `(pausedAt ?? now) - startedAt`.
 */
export type PracticeClock = { startedAt: number; pausedAt: number | null };

export function startClock(): PracticeClock {
  return { startedAt: Date.now(), pausedAt: null };
}

export function togglePause(clock: PracticeClock): PracticeClock {
  const now = Date.now();
  return clock.pausedAt == null
    ? { ...clock, pausedAt: now }
    : { startedAt: clock.startedAt + (now - clock.pausedAt), pausedAt: null };
}

/**
 * SPEC §18. The timer exists only to record metadata; it never gates submission
 * and the server trusts whatever it reports (no anti-cheat).
 *
 * The parent owns the clock so reading the elapsed time at save does not depend
 * on this component still being mounted.
 */
export function PracticeTimer({
  clock,
  onTogglePause,
}: {
  clock: PracticeClock;
  onTogglePause: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const paused = clock.pausedAt != null;

  useEffect(() => {
    if (paused) return;
    // A quarter-second tick so the display catches up promptly after a resume,
    // instead of briefly showing the last pre-pause value.
    const interval = setInterval(
      () => setElapsed(elapsedSeconds(clock)),
      250,
    );
    return () => clearInterval(interval);
  }, [clock, paused]);

  // While paused the elapsed time is fixed, so it can be derived during render.
  const shown = paused ? elapsedSeconds(clock) : elapsed;

  return (
    <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
      <p className="tabular-nums">
        Timer: {formatClock(shown)}
        {paused ? " (paused)" : null}
      </p>
      <button
        type="button"
        onClick={onTogglePause}
        className="font-medium underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        {paused ? "Resume" : "Pause"}
      </button>
    </div>
  );
}

/** The value written to `PracticeAttempt.durationSeconds` (SPEC §18). */
export function elapsedSeconds(clock: PracticeClock): number {
  const end = clock.pausedAt ?? Date.now();
  return Math.max(0, Math.round((end - clock.startedAt) / 1000));
}
