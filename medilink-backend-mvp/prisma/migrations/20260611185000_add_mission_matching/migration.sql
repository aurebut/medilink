-- CreateEnum
CREATE TYPE "MissionMatchNotificationStatus" AS ENUM ('PENDING', 'SENT', 'SKIPPED', 'FAILED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MISSION_RECOMMENDATION';

-- CreateTable
CREATE TABLE "MissionCandidateMatch" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "candidateUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "reasons" JSONB,
    "breakdown" JSONB,
    "notificationStatus" "MissionMatchNotificationStatus" NOT NULL DEFAULT 'PENDING',
    "notifiedAt" TIMESTAMP(3),
    "lastScoredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionCandidateMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MissionCandidateMatch_missionId_candidateUserId_key" ON "MissionCandidateMatch"("missionId", "candidateUserId");

-- CreateIndex
CREATE INDEX "MissionCandidateMatch_missionId_score_idx" ON "MissionCandidateMatch"("missionId", "score");

-- CreateIndex
CREATE INDEX "MissionCandidateMatch_candidateUserId_idx" ON "MissionCandidateMatch"("candidateUserId");

-- CreateIndex
CREATE INDEX "MissionCandidateMatch_notificationStatus_idx" ON "MissionCandidateMatch"("notificationStatus");

-- AddForeignKey
ALTER TABLE "MissionCandidateMatch" ADD CONSTRAINT "MissionCandidateMatch_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionCandidateMatch" ADD CONSTRAINT "MissionCandidateMatch_candidateUserId_fkey" FOREIGN KEY ("candidateUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
