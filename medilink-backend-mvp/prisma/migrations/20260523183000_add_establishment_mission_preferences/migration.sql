ALTER TABLE "Establishment"
  ADD COLUMN "mobilityOptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acceptedMissionTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "minimumCompensation" INTEGER,
  ADD COLUMN "preferredDurations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "refusedSchedules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acceptedPatientTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "knownSoftware" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Mission"
  ADD COLUMN "mobilityOptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acceptedMissionTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "minimumCompensation" INTEGER,
  ADD COLUMN "preferredDurations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "refusedSchedules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acceptedPatientTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "knownSoftware" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
