import { requireUser } from "@/lib/auth";
import { getAttemptAudio } from "@/lib/queries/audio";
import { transcodeToMp3 } from "@/lib/audio-transcode";

/**
 * Streams the recording for one attempt.
 *
 * A deliberate, narrow exception to ADR-005's "no REST layer": an `<audio>`
 * element needs a URL, and inlining megabytes of base64 into the RSC payload is
 * not a serious alternative. It stays a thin handler over a query function,
 * exactly as ADR-005 anticipated for anything that does need HTTP.
 *
 * Authorization is the whole point of the route existing rather than serving
 * files statically: the bytes are fetched by `(userId, attemptId)`, so another
 * user's recording is a 404, not a leak.
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();

  const audio = await getAttemptAudio(user.id, attemptId);
  if (!audio) {
    return new Response("Not found", { status: 404 });
  }

  // `?download` hands back an MP3 attachment: most chat apps reject WebM
  // uploads. If ffmpeg is unavailable, the original bytes are better than nothing.
  if (new URL(request.url).searchParams.has("download")) {
    try {
      const mp3 = await transcodeToMp3(audio.data);
      return audioResponse(
        mp3,
        "audio/mpeg",
        "attachment",
        `attempt-${attemptId}.mp3`,
      );
    } catch (error) {
      console.error("MP3 transcode failed; serving the original", error);
      return audioResponse(
        audio.data,
        audio.mimeType,
        "attachment",
        `attempt-${attemptId}.${extensionFor(audio.mimeType)}`,
      );
    }
  }

  const filename = `attempt-${attemptId}.${extensionFor(audio.mimeType)}`;

  // Chrome will not seek an <audio> source that ignores Range requests — it
  // restarts from 0 instead — so honour a single `bytes=start-end` range.
  const range = parseRange(request.headers.get("range"), audio.data.length);
  if (range === "unsatisfiable") {
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${audio.data.length}` },
    });
  }
  if (range) {
    const [start, end] = range;
    return audioResponse(
      audio.data.subarray(start, end + 1),
      audio.mimeType,
      "inline",
      filename,
      {
        status: 206,
        contentRange: `bytes ${start}-${end}/${audio.data.length}`,
      },
    );
  }

  return audioResponse(audio.data, audio.mimeType, "inline", filename);
}

function audioResponse(
  data: Uint8Array,
  mimeType: string,
  disposition: "inline" | "attachment",
  filename: string,
  partial?: { status: 206; contentRange: string },
): Response {
  return new Response(new Uint8Array(data), {
    status: partial?.status ?? 200,
    headers: {
      ...(partial ? { "Content-Range": partial.contentRange } : {}),
      "Content-Type": mimeType,
      "Content-Length": String(data.length),
      "Accept-Ranges": "bytes",
      // Private: this is the user's own voice. Never let a shared cache hold it.
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
    },
  });
}

/** Returns an inclusive [start, end], null for no/ignored Range, or "unsatisfiable". */
function parseRange(
  header: string | null,
  size: number,
): [number, number] | null | "unsatisfiable" {
  const match = header?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match || (match[1] === "" && match[2] === "")) return null;

  let start: number;
  let end: number;
  if (match[1] === "") {
    // Suffix range: the last N bytes.
    start = Math.max(0, size - Number(match[2]));
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || start > end) return "unsatisfiable";
  return [start, end];
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "audio/mp4":
      return "m4a";
    case "audio/mpeg":
      return "mp3";
    case "audio/ogg":
      return "ogg";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    default:
      return "webm";
  }
}
