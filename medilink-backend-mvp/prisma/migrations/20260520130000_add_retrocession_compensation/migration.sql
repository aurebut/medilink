CREATE TYPE "CompensationMode" AS ENUM ('FIXED_AMOUNT', 'RETROCESSION');

ALTER TABLE "Mission"
ADD COLUMN "compensationMode" "CompensationMode" NOT NULL DEFAULT 'FIXED_AMOUNT',
ADD COLUMN "retrocessionPercentage" INTEGER;

ALTER TABLE "MissionAgreement"
ADD COLUMN "compensationMode" "CompensationMode" NOT NULL DEFAULT 'FIXED_AMOUNT',
ADD COLUMN "retrocessionPercentage" INTEGER;
