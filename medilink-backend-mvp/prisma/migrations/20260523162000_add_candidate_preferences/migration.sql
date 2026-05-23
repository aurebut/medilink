ALTER TYPE "MedicalStatus" ADD VALUE IF NOT EXISTS 'REGULAR_LOCUM';

ALTER TABLE "Profile"
  ADD COLUMN "medicalStatusOther" TEXT,
  ADD COLUMN "preferredCities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "maxTravelRadiusKm" INTEGER,
  ADD COLUMN "mobilityOptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acceptedMissionTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "minimumCompensation" INTEGER,
  ADD COLUMN "preferredDurations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "refusedSchedules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "knownSoftware" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "acceptedPatientTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "secretaryRequired" BOOLEAN,
  ADD COLUMN "accommodationRequired" BOOLEAN,
  ADD COLUMN "fastPaymentImportant" BOOLEAN,
  ADD COLUMN "acceptedPressureLevel" TEXT;
