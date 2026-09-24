-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('SHAKY', 'OKAY', 'SOLID');

-- AlterTable
ALTER TABLE "PracticeAttempt" ADD COLUMN     "confidence" "Confidence";
