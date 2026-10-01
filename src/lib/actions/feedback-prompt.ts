"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DEFAULT_FEEDBACK_PROMPT_TEMPLATE } from "@/lib/feedback-prompt";
import { feedbackPromptTemplateSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/result";

/** Saves the current user's "Copy LLM prompt" template. */
export async function saveFeedbackPromptTemplate(
  template: string,
): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();

    const parsed = feedbackPromptTemplateSchema.safeParse(template);
    if (!parsed.success) {
      return { ok: false, error: "The prompt must be 1–10,000 characters." };
    }

    await db.user.update({
      where: { id: user.id },
      // Saving the default verbatim stores null, so later improvements to the
      // default still reach anyone who never customized it.
      data: {
        feedbackPromptTemplate:
          parsed.data === DEFAULT_FEEDBACK_PROMPT_TEMPLATE ? null : parsed.data,
      },
    });

    revalidatePath("/feedback-prompt");
    revalidatePath("/attempts/[attemptId]", "page");
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("saveFeedbackPromptTemplate failed", error);
    return { ok: false, error: "Something went wrong while saving the prompt." };
  }
}
