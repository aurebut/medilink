CREATE TYPE "HealthVerificationStatus" AS ENUM (
  'NOT_SUBMITTED',
  'PENDING',
  'VERIFIED',
  'NOT_FOUND',
  'MISMATCH',
  'ERROR'
);

ALTER TABLE "Profile"
  ADD COLUMN "rpps" TEXT,
  ADD COLUMN "healthVerificationStatus" "HealthVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
  ADD COLUMN "healthVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "healthVerificationCheckedAt" TIMESTAMP(3),
  ADD COLUMN "ansPractitionerId" TEXT,
  ADD COLUMN "ansPractitionerLastUpdated" TIMESTAMP(3),
  ADD COLUMN "verifiedProfession" TEXT,
  ADD COLUMN "verifiedSpecialty" TEXT,
  ADD COLUMN "healthVerificationPayload" JSONB;

CREATE UNIQUE INDEX "Profile_rpps_key" ON "Profile"("rpps");
