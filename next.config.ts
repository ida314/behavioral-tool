import type { NextConfig } from "next";

/** Keep in step with MAX_AUDIO_BYTES in src/lib/audio.ts. */
const AUDIO_UPLOAD_LIMIT = "26mb";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Spoken answers are uploaded through Server Actions, and the default cap
      // is 1MB — roughly 30 seconds of Opus. 25MB of audio plus multipart
      // overhead covers an answer far longer than anyone gives in an interview.
      bodySizeLimit: AUDIO_UPLOAD_LIMIT,
    },
  },
};

export default nextConfig;
