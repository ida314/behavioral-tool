import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

/**
 * Local speech-to-text with whisper.cpp (docs/DECISIONS.md ADR-010).
 *
 * Runs entirely on this machine: no API key, no audio leaving the host, no
 * per-minute cost. `npm run whisper:setup` builds the binary and downloads a
 * model; both paths are overridable so a bigger host can run a bigger model.
 *
 * Server-only — imported by a Server Action, never by a client component.
 */

const execFileAsync = promisify(execFile);

const REPO_WHISPER_DIR = join(process.cwd(), ".whisper");

function whisperBin(): string {
  return (
    process.env.WHISPER_BIN ??
    join(REPO_WHISPER_DIR, "whisper.cpp", "build", "bin", "whisper-cli")
  );
}

function whisperModel(): string {
  return (
    process.env.WHISPER_MODEL ??
    join(REPO_WHISPER_DIR, "models", "ggml-base.en.bin")
  );
}

const FFMPEG = process.env.FFMPEG_BIN ?? "ffmpeg";

/** Whisper needs 16 kHz mono PCM; browsers record Opus in WebM or MP4. */
const TARGET_SAMPLE_RATE = "16000";

/** Guards against a runaway process holding a request open forever. */
const TRANSCRIBE_TIMEOUT_MS = Number(
  process.env.WHISPER_TIMEOUT_MS ?? 5 * 60 * 1000,
);

export class TranscriptionError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

/**
 * Transcribes a recording and returns the text.
 *
 * Both temp files are removed even when whisper fails — an interview answer is
 * private, and a crash is no reason to leave it sitting in /tmp.
 */
export async function transcribeAudio(audio: Uint8Array): Promise<string> {
  const workDir = await mkdtemp(join(tmpdir(), "behavioral-prep-"));
  const inputPath = join(workDir, "input");
  const wavPath = join(workDir, "audio.wav");

  try {
    await writeFile(inputPath, audio);

    // Let ffmpeg sniff the container: Chrome sends audio/webm, Safari audio/mp4.
    try {
      await execFileAsync(
        FFMPEG,
        [
          "-hide_banner",
          "-loglevel", "error",
          "-i", inputPath,
          "-ar", TARGET_SAMPLE_RATE,
          "-ac", "1",
          "-c:a", "pcm_s16le",
          "-y", wavPath,
        ],
        { timeout: TRANSCRIBE_TIMEOUT_MS },
      );
    } catch (error) {
      throw new TranscriptionError(
        "The recording could not be decoded. It may be empty or in an unsupported format.",
        error,
      );
    }

    let stdout: string;
    try {
      // -nt strips the [00:00:00.000 --> ...] timestamps, leaving plain text.
      ({ stdout } = await execFileAsync(
        whisperBin(),
        [
          "-m", whisperModel(),
          "-f", wavPath,
          "-nt",
          "-np",
          "-t", String(process.env.WHISPER_THREADS ?? 4),
        ],
        { timeout: TRANSCRIBE_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 },
      ));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      if (detail.includes("ENOENT")) {
        throw new TranscriptionError(
          "Transcription is not set up on this server. Run `npm run whisper:setup`.",
          error,
        );
      }
      throw new TranscriptionError("Transcription failed.", error);
    }

    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join(" ")
      .trim();
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** Whether the binary and model are present, for a clearer error up front. */
export async function transcriptionAvailable(): Promise<boolean> {
  try {
    await Promise.all([readFile(whisperBin()), readFile(whisperModel())]);
    return true;
  } catch {
    return false;
  }
}
