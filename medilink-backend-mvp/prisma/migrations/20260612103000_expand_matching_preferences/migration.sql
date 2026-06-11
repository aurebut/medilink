-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "acceptedWeekdays" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "acceptedTimeSlots" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "minimumNoticeHours" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "mobilityRangeType" TEXT;
ALTER TABLE "Profile" ADD COLUMN "housingRequiredBeyondKm" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "acceptedPracticeSettings" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "refusedPatientTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "maxPatientsPerDay" INTEGER;
ALTER TABLE "Profile" ADD COLUMN "parkingRequired" BOOLEAN;
ALTER TABLE "Profile" ADD COLUMN "acceptedActs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN "refusedActs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN "practiceSetting" TEXT;
ALTER TABLE "Mission" ADD COLUMN "requiredActs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "MissionCandidateMatch" ADD COLUMN "eligible" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MissionCandidateMatch" ADD COLUMN "exclusionReasons" JSONB;
