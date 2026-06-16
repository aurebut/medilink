-- Create MigrationScript

-- Alter "MissionCandidateMatch" table
ALTER TABLE "MissionCandidateMatch" ADD COLUMN "manualOverrideEligible" BOOLEAN;
ALTER TABLE "MissionCandidateMatch" ADD COLUMN "manualOverrideReason" TEXT;
ALTER TABLE "MissionCandidateMatch" ADD COLUMN "manualOverrideBy" TEXT;
ALTER TABLE "MissionCandidateMatch" ADD COLUMN "manualOverrideAt" TIMESTAMP(3);
