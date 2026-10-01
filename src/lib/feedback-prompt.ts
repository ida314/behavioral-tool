/**
 * The text behind "Copy LLM prompt" on the attempt page.
 *
 * Rendered on the server and handed to the client as a plain string: the app
 * itself never calls a model (SPEC §3) — the user pastes this into one of their own.
 *
 * Users can edit the template at /feedback-prompt; it is stored on `User` and
 * falls back to the default below.
 */

export const FEEDBACK_PROMPT_PLACEHOLDERS = [
  "question",
  "my_response",
  "ideal_response",
] as const;

type Placeholder = (typeof FEEDBACK_PROMPT_PLACEHOLDERS)[number];

export const DEFAULT_FEEDBACK_PROMPT_TEMPLATE = `Critique my answer to this behavioral question. I am preparing for full-time SWE behavioral interview rounds.

Act as a teacher, not an answer key. Do not rewrite my answer or tell me what I should have said straight away. Point out where it falls short and ask me guiding questions so I have to struggle to recall and improve it myself. Only give me the answer directly if I ask for it.

If I've included the response I have written down for this type of question, compare my answer against it: what did I leave out or forget, and what did I say better?

Question:
{{question}}

My response:
{{my_response}}

My response I have written down for this type of question:
{{ideal_response}}`;

// One pass over the template, so a placeholder that happens to appear inside
// the user's own answer is left alone rather than substituted again.
const PLACEHOLDER_PATTERN = new RegExp(
  `\\{\\{\\s*(${FEEDBACK_PROMPT_PLACEHOLDERS.join("|")})\\s*\\}\\}`,
  "g",
);

export function renderFeedbackPrompt(
  template: string,
  input: {
    question: string;
    response: string;
    story: { title: string; description: string | null } | null;
  },
): string {
  const values: Record<Placeholder, string> = {
    question: input.question,
    my_response: input.response,
    // No story selected: leave the section blank rather than inventing one.
    ideal_response: input.story
      ? [input.story.title, input.story.description].filter(Boolean).join("\n\n")
      : "",
  };

  return template.replace(
    PLACEHOLDER_PATTERN,
    (_, name: Placeholder) => values[name],
  );
}
