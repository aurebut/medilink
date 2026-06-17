-- Matching scaling optimizations:
-- 1. Composite index on User for candidate pool pre-filtering
CREATE INDEX IF NOT EXISTS "User_role_status_emailVerified_idx"
  ON "User" ("role", "status", "emailVerified");

-- 2. GIN indexes on Profile arrays + supporting B-tree indexes for pre-filter
CREATE INDEX IF NOT EXISTS "Profile_preferredCities_gin_idx"
  ON "Profile" USING GIN ("preferredCities");
CREATE INDEX IF NOT EXISTS "Profile_acceptedMissionTypes_gin_idx"
  ON "Profile" USING GIN ("acceptedMissionTypes");
CREATE INDEX IF NOT EXISTS "Profile_medicalStatus_idx"
  ON "Profile" ("medicalStatus");
CREATE INDEX IF NOT EXISTS "Profile_completionScore_idx"
  ON "Profile" ("completionScore");

-- 3. MatchingDispatchJobStatus enum + MatchingDispatchJob table (DB-backed async dispatch queue)
DO $$ BEGIN
  CREATE TYPE "MatchingDispatchJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "MatchingDispatchJob" (
  "id"              TEXT NOT NULL,
  "missionId"       TEXT NOT NULL,
  "actorUserId"     TEXT NOT NULL,
  "status"          "MatchingDispatchJobStatus" NOT NULL DEFAULT 'QUEUED',
  "targetCount"     INTEGER NOT NULL,
  "minimumScore"    INTEGER NOT NULL,
  "candidateUserIds" TEXT[]   DEFAULT ARRAY[]::TEXT[],
  "selectedTier"    TEXT,
  "acceptedCount"   INTEGER NOT NULL DEFAULT 0,
  "sentCount"       INTEGER NOT NULL DEFAULT 0,
  "failedCount"     INTEGER NOT NULL DEFAULT 0,
  "failures"        JSONB,
  "error"           TEXT,
  "startedAt"       TIMESTAMP(3),
  "completedAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MatchingDispatchJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MatchingDispatchJob_status_createdAt_idx"
  ON "MatchingDispatchJob" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "MatchingDispatchJob_missionId_idx"
  ON "MatchingDispatchJob" ("missionId");

ALTER TABLE "MatchingDispatchJob"
  ADD CONSTRAINT "MatchingDispatchJob_missionId_fkey"
  FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MatchingDispatchJob"
  ADD CONSTRAINT "MatchingDispatchJob_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Index on MissionCandidateMatch.lastScoredAt for score-cache freshness checks
CREATE INDEX IF NOT EXISTS "MissionCandidateMatch_lastScoredAt_idx"
  ON "MissionCandidateMatch" ("lastScoredAt");
