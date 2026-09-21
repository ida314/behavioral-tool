import type { NextConfig } from "next";

/** Keep in step with MAX_AUDIO_BYTES in src/lib/audio.ts. */
const AUDIO_UPLOAD_LIMIT = "26mb";

const nextConfig: NextConfig = {
  // Deployed by copying `.next/standalone` onto this machine and running its `server.js`
  // under a systemd user unit — see deploy/README.md. Standalone output is what makes that
  // a self-contained tree instead of a checkout plus a full `node_modules`.
  output: "standalone",

  experimental: {
    serverActions: {
      // Tailscale Serve terminates TLS as behavioral-tool.tail2e282c.ts.net and proxies to
      // 127.0.0.1, so a Server Action's Origin never matches the origin Next sees. Without
      // this, every action is rejected as cross-origin.
      allowedOrigins: ["behavioral-tool.tail2e282c.ts.net"],
    },
  },
};

export default nextConfig;
