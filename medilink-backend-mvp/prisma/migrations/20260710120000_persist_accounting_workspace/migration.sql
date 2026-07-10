CREATE TYPE "AccountingOwnerType" AS ENUM ('CANDIDATE', 'ESTABLISHMENT');
CREATE TYPE "AccountingEntryKind" AS ENUM ('REVENUE', 'EXPENSE');

CREATE TABLE "AccountingWorkspace" (
    "id" TEXT NOT NULL,
    "ownerType" "AccountingOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "provisionRate" INTEGER,
    "budgetLimit" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingWorkspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingEntry" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "kind" "AccountingEntryKind" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL,
    "counterparty" TEXT NOT NULL,
    "missionLabel" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentMethod" TEXT NOT NULL,
    "notes" TEXT,
    "hasReceipt" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccountingEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AccountingClassification" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "recordKey" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AccountingClassification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountingWorkspace_ownerType_ownerId_key" ON "AccountingWorkspace"("ownerType", "ownerId");
CREATE INDEX "AccountingWorkspace_ownerType_ownerId_idx" ON "AccountingWorkspace"("ownerType", "ownerId");
CREATE INDEX "AccountingEntry_workspaceId_entryDate_idx" ON "AccountingEntry"("workspaceId", "entryDate");
CREATE UNIQUE INDEX "AccountingClassification_workspaceId_recordKey_key" ON "AccountingClassification"("workspaceId", "recordKey");
CREATE INDEX "AccountingClassification_workspaceId_idx" ON "AccountingClassification"("workspaceId");

ALTER TABLE "AccountingEntry" ADD CONSTRAINT "AccountingEntry_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AccountingWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountingClassification" ADD CONSTRAINT "AccountingClassification_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "AccountingWorkspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
