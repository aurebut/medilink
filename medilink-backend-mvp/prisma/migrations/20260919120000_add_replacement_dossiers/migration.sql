CREATE TABLE "ReplacementDossier" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReplacementDossier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReplacementDossier_revision_check" CHECK ("revision" >= 1)
);

CREATE TABLE "ReplacementDossierDocument" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADING',
    "source" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "detailsSnapshot" JSONB,
    "templateVersion" TEXT,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReplacementDossierDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReplacementDossierDocument_kind_check" CHECK ("kind" IN ('CONTRACT', 'DECLARATION', 'SIGNED_CONTRACT', 'REGISTRATION', 'LICENSE', 'AUTHORIZATION', 'INSURANCE', 'OTHER')),
    CONSTRAINT "ReplacementDossierDocument_status_check" CHECK ("status" IN ('UPLOADING', 'READY')),
    CONSTRAINT "ReplacementDossierDocument_source_check" CHECK ("source" IN ('GENERATED', 'UPLOADED')),
    CONSTRAINT "ReplacementDossierDocument_size_check" CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 10485760),
    CONSTRAINT "ReplacementDossierDocument_version_check" CHECK ("version" >= 1 AND "revision" >= 1)
);

CREATE TABLE "ReplacementDossierDelivery" (
    "id" TEXT NOT NULL,
    "dossierId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "message" TEXT,
    "documentIds" TEXT[],
    "documentSnapshots" JSONB NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENDING',
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    CONSTRAINT "ReplacementDossierDelivery_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ReplacementDossierDelivery_status_check" CHECK ("status" IN ('SENDING', 'SENT', 'FAILED')),
    CONSTRAINT "ReplacementDossierDelivery_recipient_check" CHECK ("recipientType" IN ('COUNTERPART', 'ORDER'))
);

CREATE UNIQUE INDEX "ReplacementDossier_applicationId_key" ON "ReplacementDossier"("applicationId");
CREATE UNIQUE INDEX "ReplacementDossierDocument_storageKey_key" ON "ReplacementDossierDocument"("storageKey");
CREATE UNIQUE INDEX "ReplacementDossierDocument_dossierId_kind_version_key" ON "ReplacementDossierDocument"("dossierId", "kind", "version");
CREATE INDEX "ReplacementDossierDocument_dossierId_createdAt_idx" ON "ReplacementDossierDocument"("dossierId", "createdAt");
CREATE UNIQUE INDEX "ReplacementDossierDelivery_dossierId_idempotencyKey_key" ON "ReplacementDossierDelivery"("dossierId", "idempotencyKey");
CREATE INDEX "ReplacementDossierDelivery_dossierId_createdAt_idx" ON "ReplacementDossierDelivery"("dossierId", "createdAt");

ALTER TABLE "ReplacementDossier" ADD CONSTRAINT "ReplacementDossier_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplacementDossierDocument" ADD CONSTRAINT "ReplacementDossierDocument_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "ReplacementDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReplacementDossierDelivery" ADD CONSTRAINT "ReplacementDossierDelivery_dossierId_fkey" FOREIGN KEY ("dossierId") REFERENCES "ReplacementDossier"("id") ON DELETE CASCADE ON UPDATE CASCADE;
