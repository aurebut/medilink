CREATE TYPE "AccountingEntrySource" AS ENUM ('MANUAL', 'MEDILINK', 'BANK', 'IMPORT');
CREATE TYPE "AccountingEntryStatus" AS ENUM ('DRAFT', 'TO_REVIEW', 'VALIDATED', 'VOIDED');
CREATE TYPE "AccountingTaxRegime" AS ENUM ('MICRO_BNC', 'CONTROLLED_DECLARATION');
CREATE TYPE "AccountingSocialScheme" AS ENUM ('RSPM', 'PAMC', 'OTHER');
CREATE TYPE "AccountingActivityMode" AS ENUM ('LIBERAL', 'SALARIED', 'MIXED');
CREATE TYPE "AccountingDeclarationFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'ANNUAL');
CREATE TYPE "RetrocessionSettlementStatus" AS ENUM ('EXPECTED', 'TO_VALIDATE', 'VALIDATED', 'PAID', 'DISPUTED');

ALTER TABLE "AccountingEntry"
  ADD COLUMN "source" "AccountingEntrySource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "status" "AccountingEntryStatus" NOT NULL DEFAULT 'VALIDATED',
  ADD COLUMN "categoryCode" TEXT,
  ADD COLUMN "professionalShareBps" INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN "agreementId" TEXT,
  ADD COLUMN "sourceKey" TEXT,
  ADD COLUMN "validatedAt" TIMESTAMP(3),
  ADD COLUMN "voidedAt" TIMESTAMP(3);

ALTER TABLE "Invoice" ADD COLUMN "amountCents" INTEGER;
UPDATE "Invoice" SET "amountCents" = "amount" * 100 WHERE "amountCents" IS NULL;

UPDATE "AccountingEntry" SET "validatedAt" = "createdAt" WHERE "validatedAt" IS NULL;

CREATE TABLE "AccountingProfile" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "taxRegime" "AccountingTaxRegime",
  "socialScheme" "AccountingSocialScheme",
  "activityMode" "AccountingActivityMode",
  "declarationFrequency" "AccountingDeclarationFrequency",
  "activityStartDate" TIMESTAMP(3),
  "exclusiveLocum" BOOLEAN,
  "hasOtherIndependentActivity" BOOLEAN,
  "onboardingCompletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AccountingProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RetrocessionSettlement" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "agreementId" TEXT NOT NULL,
  "status" "RetrocessionSettlementStatus" NOT NULL DEFAULT 'EXPECTED',
  "rateBasisPoints" INTEGER,
  "grossHonorariaCents" INTEGER,
  "expectedAmountCents" INTEGER,
  "finalAmountCents" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "dueDate" TIMESTAMP(3),
  "validatedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RetrocessionSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingProfile_workspaceId_key" ON "AccountingProfile"("workspaceId");
CREATE UNIQUE INDEX "RetrocessionSettlement_agreementId_key" ON "RetrocessionSettlement"("agreementId");
CREATE INDEX "RetrocessionSettlement_workspaceId_status_idx" ON "RetrocessionSettlement"("workspaceId", "status");
CREATE INDEX "RetrocessionSettlement_workspaceId_paidAt_idx" ON "RetrocessionSettlement"("workspaceId", "paidAt");
CREATE INDEX "AccountingEntry_workspaceId_kind_status_entryDate_idx" ON "AccountingEntry"("workspaceId", "kind", "status", "entryDate");
CREATE INDEX "AccountingEntry_agreementId_idx" ON "AccountingEntry"("agreementId");
CREATE UNIQUE INDEX "AccountingEntry_workspaceId_sourceKey_key" ON "AccountingEntry"("workspaceId", "sourceKey");

ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "MissionAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountingProfile" ADD CONSTRAINT "AccountingProfile_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AccountingWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RetrocessionSettlement" ADD CONSTRAINT "RetrocessionSettlement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AccountingWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RetrocessionSettlement" ADD CONSTRAINT "RetrocessionSettlement_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "MissionAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
