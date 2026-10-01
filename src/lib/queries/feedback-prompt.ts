import { db } from "@/lib/db";
import { DEFAULT_FEEDBACK_PROMPT_TEMPLATE } from "@/lib/feedback-prompt";

/** The user's "Copy LLM prompt" template, or the default if they never saved one. */
export async function getFeedbackPromptTemplate(userId: string): Promise<string> {
  const user = await db.user.findFirst({
    where: { id: userId },
    select: { feedbackPromptTemplate: true },
  });
  return user?.feedbackPromptTemplate ?? DEFAULT_FEEDBACK_PROMPT_TEMPLATE;
}
