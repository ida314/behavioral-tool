import { db } from "@/lib/db";
import type { Competency } from "@/lib/competency";

/** Story reads (SPEC §8.7). Always scoped to the calling user (SPEC §20). */

export type StoryListItem = {
  id: string;
  title: string;
  description: string | null;
  attemptCount: number;
};

export async function listStories(userId: string): Promise<StoryListItem[]> {
  const stories = await db.story.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      description: true,
      _count: { select: { attempts: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return stories.map(({ _count, ...story }) => ({
    ...story,
    attemptCount: _count.attempts,
  }));
}

export type StoryOption = { id: string; title: string };

/** The minimal shape the practice save panel needs (SPEC §8.4). */
export async function listStoryOptions(userId: string): Promise<StoryOption[]> {
  return db.story.findMany({
    where: { userId },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });
}

export type StoryWithAttempts = {
  id: string;
  title: string;
  description: string | null;
  attempts: {
    id: string;
    createdAt: Date;
    question: { id: string; text: string; competency: Competency };
  }[];
};

export async function getStoryWithAttempts(
  userId: string,
  storyId: string,
): Promise<StoryWithAttempts | null> {
  return db.story.findFirst({
    where: { id: storyId, userId },
    select: {
      id: true,
      title: true,
      description: true,
      attempts: {
        select: {
          id: true,
          createdAt: true,
          question: { select: { id: true, text: true, competency: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}
