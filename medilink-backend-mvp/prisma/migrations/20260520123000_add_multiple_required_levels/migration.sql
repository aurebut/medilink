ALTER TYPE "RequiredLevel" ADD VALUE IF NOT EXISTS 'NURSE';
ALTER TYPE "RequiredLevel" ADD VALUE IF NOT EXISTS 'OPERATING_ROOM_ASSISTANT';
ALTER TYPE "RequiredLevel" ADD VALUE IF NOT EXISTS 'OTHER';

ALTER TABLE "Mission"
ADD COLUMN "requiredLevels" "RequiredLevel"[] NOT NULL DEFAULT ARRAY[]::"RequiredLevel"[];

UPDATE "Mission"
SET "requiredLevels" = ARRAY["requiredLevel"]::"RequiredLevel"[]
WHERE cardinality("requiredLevels") = 0;
