ALTER TABLE "Establishment"
  ADD COLUMN "secretaryType" TEXT,
  ADD COLUMN "averagePatientsPerDay" INTEGER,
  ADD COLUMN "isMultidisciplinary" BOOLEAN,
  ADD COLUMN "equipmentAvailable" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Mission"
  ADD COLUMN "secretaryType" TEXT,
  ADD COLUMN "averagePatientsPerDay" INTEGER,
  ADD COLUMN "isMultidisciplinary" BOOLEAN,
  ADD COLUMN "equipmentAvailable" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
