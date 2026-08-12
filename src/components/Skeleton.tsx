/** Placeholder blocks for `loading.tsx` boundaries. */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="space-y-3" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <li
          key={index}
          className="h-24 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900"
        />
      ))}
    </ul>
  );
}

export function SkeletonHeading() {
  return (
    <div
      className="h-8 w-48 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
      aria-hidden
    />
  );
}
