"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  createStorySchema,
  updateStorySchema,
  type CreateStoryInput,
  type UpdateStoryInput,
} from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/result";
import type { StoryOption } from "@/lib/queries/stories";

/** Story writes (SPEC §16). Every one is scoped to `requireUser()` (SPEC §20). */

function revalidateStoryViews() {
  revalidatePath("/stories");
  revalidatePath("/history");
}

/**
 * Creates a story and returns it, so the practice save panel can select it in
 * place without a navigation that would discard the user's answer (SPEC §8.4).
 */
export async function createStory(
  input: CreateStoryInput,
): Promise<ActionResult<StoryOption>> {
  try {
    const user = await requireUser();

    const parsed = createStorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "A story needs a title of 1–100 characters." };
    }

    const story = await db.story.create({
      data: {
        userId: user.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
      },
      select: { id: true, title: true },
    });

    revalidateStoryViews();
    return { ok: true, data: story };
  } catch (error) {
    console.error("createStory failed", error);
    return { ok: false, error: "Something went wrong while saving the story." };
  }
}

export async function updateStory(
  input: UpdateStoryInput,
): Promise<ActionResult<StoryOption>> {
  try {
    const user = await requireUser();

    const parsed = updateStorySchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: "A story needs a title of 1–100 characters." };
    }

    // updateMany rather than update: it lets the userId sit in the WHERE clause,
    // so another user's story simply matches nothing (SPEC §20).
    const result = await db.story.updateMany({
      where: { id: parsed.data.id, userId: user.id },
      data: {
        title: parsed.data.title,
        description: parsed.data.description ?? null,
      },
    });

    if (result.count === 0) {
      return { ok: false, error: "That story could not be found." };
    }

    revalidateStoryViews();
    return {
      ok: true,
      data: { id: parsed.data.id, title: parsed.data.title },
    };
  } catch (error) {
    console.error("updateStory failed", error);
    return { ok: false, error: "Something went wrong while saving the story." };
  }
}

/**
 * Deletes a story. Practice attempts that referenced it survive with a null
 * `storyId` — the schema's `onDelete: SetNull` does this, and nothing here may
 * work around it (SPEC §16, ADR-007). Losing practice history to a story
 * cleanup would destroy the one thing this product accumulates.
 */
export async function deleteStory(storyId: string): Promise<ActionResult<void>> {
  try {
    const user = await requireUser();

    const result = await db.story.deleteMany({
      where: { id: storyId, userId: user.id },
    });

    if (result.count === 0) {
      return { ok: false, error: "That story could not be found." };
    }

    revalidateStoryViews();
    return { ok: true, data: undefined };
  } catch (error) {
    console.error("deleteStory failed", error);
    return { ok: false, error: "Something went wrong while deleting the story." };
  }
}
