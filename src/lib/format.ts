/**
 * Display formatting (SPEC §8.5, §8.6).
 *
 * Call the date helpers from Server Components only. They render in the server's
 * timezone, so using them inside a client component risks a hydration mismatch.
 */

const longDate = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
});

/** `August 8, 2026` */
export function formatDate(date: Date): string {
  return longDate.format(date);
}

/** `August 8` */
export function formatDateShort(date: Date): string {
  return shortDate.format(date);
}

/** `2m 14s` — or `44s` when under a minute. */
export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

/** `01:42` — the running practice timer (SPEC §8.3). */
export function formatClock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
