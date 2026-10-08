import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

/**
 * Re-encodes a recording as MP3 for download.
 *
 * Browsers record WebM/Opus, which many chat apps refuse as an upload and which
 * carries no duration header. MP3 is accepted nearly everywhere. Server-only;
 * uses the same ffmpeg the transcription pipeline already needs.
 */

const execFileAsync = promisify(execFile);

const FFMPEG = process.env.FFMPEG_BIN ?? "ffmpeg";

export async function transcodeToMp3(audio: Uint8Array): Promise<Uint8Array> {
  const workDir = await mkdtemp(join(tmpdir(), "behavioral-prep-"));
  const inputPath = join(workDir, "input");
  const outputPath = join(workDir, "audio.mp3");

  try {
    await writeFile(inputPath, audio);
    await execFileAsync(
      FFMPEG,
      [
        "-hide_banner",
        "-loglevel", "error",
        "-i", inputPath,
        "-vn",
        "-c:a", "libmp3lame",
        "-q:a", "4",
        "-y", outputPath,
      ],
      { timeout: 2 * 60 * 1000 },
    );
    return new Uint8Array(await readFile(outputPath));
  } finally {
    // An interview answer is private; never leave it sitting in /tmp.
    await rm(workDir, { recursive: true, force: true });
  }
}
