import { requireUser } from "@/lib/auth";
import { getAttemptAudio } from "@/lib/queries/audio";

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
  _request: Request,
  ctx: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();

  const audio = await getAttemptAudio(user.id, attemptId);
  if (!audio) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(audio.data), {
    headers: {
      "Content-Type": audio.mimeType,
      "Content-Length": String(audio.byteSize),
      // Private: this is the user's own voice. Never let a shared cache hold it.
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `inline; filename="attempt-${attemptId}.${extensionFor(audio.mimeType)}"`,
    },
  });
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
