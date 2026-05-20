ALTER TABLE "Establishment"
ADD COLUMN "sector" TEXT,
ADD COLUMN "patientType" TEXT,
ADD COLUMN "softwareUsed" TEXT,
ADD COLUMN "hasSecretary" BOOLEAN;

ALTER TABLE "Mission"
ADD COLUMN "sector" TEXT,
ADD COLUMN "patientType" TEXT,
ADD COLUMN "hasSecretary" BOOLEAN;

CREATE INDEX "Establishment_sector_idx" ON "Establishment"("sector");
CREATE INDEX "Establishment_patientType_idx" ON "Establishment"("patientType");
CREATE INDEX "Establishment_softwareUsed_idx" ON "Establishment"("softwareUsed");
CREATE INDEX "Mission_sector_idx" ON "Mission"("sector");
CREATE INDEX "Mission_patientType_idx" ON "Mission"("patientType");
CREATE INDEX "Mission_softwareUsed_idx" ON "Mission"("softwareUsed");
