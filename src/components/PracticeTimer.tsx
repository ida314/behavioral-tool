"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";

/**
 * SPEC §18. The timer exists only to record metadata; it never gates submission
 * and the server trusts whatever it reports (no anti-cheat).
 *
 * The parent owns `startedAt` so reading the elapsed time at save does not depend
 * on this component still being mounted. It is null until the parent has mounted
 * — a `Date.now()` during SSR would differ from the client's and break hydration.
 */
export function PracticeTimer({ startedAt }: { startedAt: number | null }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startedAt == null) return;
    // No synchronous first tick: at mount the elapsed time is 0, which is what
    // the initial state already shows.
    const interval = setInterval(
      () => setElapsed(elapsedSeconds(startedAt)),
      1000,
    );
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <p className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
      Timer: {formatClock(elapsed)}
    </p>
  );
}

/** The value written to `PracticeAttempt.durationSeconds` (SPEC §18). */
export function elapsedSeconds(startedAt: number): number {
  return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
}
