import Link from "next/link";
import { FeedbackPromptEditor } from "@/components/FeedbackPromptEditor";
import { requireUser } from "@/lib/auth";
import { getFeedbackPromptTemplate } from "@/lib/queries/feedback-prompt";

/** Edit the template behind "Copy LLM prompt" on the attempt page. */
export default async function FeedbackPromptPage(
  props: PageProps<"/feedback-prompt">,
) {
  const { attempt } = await props.searchParams;
  const user = await requireUser();
  const template = await getFeedbackPromptTemplate(user.id);

  // Only used to build a link back, never to read data; still, accept nothing
  // that isn't shaped like an id.
  const backTo =
    typeof attempt === "string" && /^[\w-]+$/.test(attempt)
      ? `/attempts/${attempt}`
      : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">LLM feedback prompt</h1>
      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        What &ldquo;Copy LLM prompt&rdquo; puts on your clipboard from an attempt.
      </p>

      <div className="mt-6">
        <FeedbackPromptEditor initial={template} />
      </div>

      {backTo ? (
        <Link
          href={backTo}
          className="mt-8 inline-block text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          Back to attempt
        </Link>
      ) : null}
    </div>
  );
}
