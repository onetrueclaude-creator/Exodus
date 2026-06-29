
-- CreateEnum
CREATE TYPE "QuestCadence" AS ENUM ('DAILY', 'WEEKLY', 'MILESTONE');

-- CreateEnum
CREATE TYPE "ScoreEventType" AS ENUM ('CHECK_IN', 'QUEST_DAILY', 'QUEST_WEEKLY', 'QUEST_MILESTONE', 'SECURE', 'MINE', 'BUG_REPORT', 'GOVERNANCE_VOTE', 'REFERRAL_CREDIT', 'STREAK_BONUS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "genesisCohortBatch" INTEGER,
ADD COLUMN     "genesisJoinedAt" TIMESTAMP(3),
ADD COLUMN     "kycVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "lastCheckInAt" TIMESTAMP(3),
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "referralCode" TEXT;

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "cadence" "QuestCadence" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseScore" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestCompletion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "windowKey" TEXT NOT NULL,
    "awardedScore" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "refereeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "qualifiedAt" TIMESTAMP(3),

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCredit" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "windowKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreLedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "ScoreEventType" NOT NULL,
    "scoreDelta" INTEGER NOT NULL,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Quest_key_key" ON "Quest"("key");

-- CreateIndex
CREATE INDEX "Quest_cadence_idx" ON "Quest"("cadence");

-- CreateIndex
CREATE INDEX "QuestCompletion_userId_idx" ON "QuestCompletion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestCompletion_userId_questId_windowKey_key" ON "QuestCompletion"("userId", "questId", "windowKey");

-- CreateIndex
CREATE UNIQUE INDEX "Referral_refereeId_key" ON "Referral"("refereeId");

-- CreateIndex
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- CreateIndex
CREATE INDEX "ReferralCredit_referrerId_idx" ON "ReferralCredit"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralCredit_referralId_windowKey_key" ON "ReferralCredit"("referralId", "windowKey");

-- CreateIndex
CREATE INDEX "ScoreLedgerEntry_userId_idx" ON "ScoreLedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "ScoreLedgerEntry_createdAt_idx" ON "ScoreLedgerEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_refereeId_fkey" FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCredit" ADD CONSTRAINT "ReferralCredit_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreLedgerEntry" ADD CONSTRAINT "ScoreLedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

