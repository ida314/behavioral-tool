"use client";

import { useRef } from "react";

/**
 * An `<audio controls>` that works with browser recordings.
 *
 * MediaRecorder writes WebM without a duration in the header, so Chrome reports
 * `duration === Infinity` and pins the seek bar at the end for the whole
 * playback. Seeking far past the end forces the browser to scan the file and
 * discover the real duration; snapping back to 0 then leaves a normal player.
 */
export function AudioPlayer({
  src,
  preload = "metadata",
}: {
  src: string;
  preload?: "none" | "metadata" | "auto";
}) {
  const fixing = useRef(false);

  function onLoadedMetadata(event: React.SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;
    if (audio.duration !== Infinity) return;
    fixing.current = true;
    audio.currentTime = Number.MAX_SAFE_INTEGER;
  }

  function onDurationChange(event: React.SyntheticEvent<HTMLAudioElement>) {
    const audio = event.currentTarget;
    if (!fixing.current || !Number.isFinite(audio.duration)) return;
    fixing.current = false;
    audio.currentTime = 0;
  }

  return (
    <audio
      src={src}
      controls
      preload={preload}
      onLoadedMetadata={onLoadedMetadata}
      onDurationChange={onDurationChange}
      className="w-full"
    />
  );
}
