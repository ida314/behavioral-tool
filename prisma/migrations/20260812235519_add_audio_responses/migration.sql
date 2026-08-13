-- CreateEnum
CREATE TYPE "ResponseType" AS ENUM ('TEXT', 'AUDIO');

-- AlterTable
ALTER TABLE "PracticeAttempt" ADD COLUMN     "responseType" "ResponseType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "transcript" TEXT;

-- CreateTable
CREATE TABLE "AttemptAudio" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttemptAudio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAudio_attemptId_key" ON "AttemptAudio"("attemptId");

-- CreateIndex
CREATE INDEX "AttemptAudio_userId_idx" ON "AttemptAudio"("userId");

-- AddForeignKey
ALTER TABLE "AttemptAudio" ADD CONSTRAINT "AttemptAudio_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "PracticeAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAudio" ADD CONSTRAINT "AttemptAudio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
