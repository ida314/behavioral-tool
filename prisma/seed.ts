import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { questions } from "../src/data/questions";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.");
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  // Idempotent: questions carry stable ids, so re-seeding updates text in place
  // rather than creating duplicates or breaking PracticeAttempt.questionId.
  for (const question of questions) {
    await db.question.upsert({
      where: { id: question.id },
      create: question,
      update: { text: question.text, competency: question.competency },
    });
  }
  console.log(`Seeded ${questions.length} questions.`);

  // Dev-stub identity (docs/DECISIONS.md ADR-003). Harmless once real auth lands.
  const devUserId = process.env.DEV_USER_ID ?? "dev-user";
  await db.user.upsert({
    where: { id: devUserId },
    create: {
      id: devUserId,
      email: process.env.DEV_USER_EMAIL ?? "dev@example.com",
      name: process.env.DEV_USER_NAME ?? "Dev User",
    },
    update: {},
  });
  console.log(`Ensured dev user "${devUserId}".`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
