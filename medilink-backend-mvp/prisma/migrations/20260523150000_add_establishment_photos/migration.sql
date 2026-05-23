CREATE TABLE "EstablishmentPhoto" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstablishmentPhoto_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstablishmentPhoto_storageKey_key" ON "EstablishmentPhoto"("storageKey");
CREATE INDEX "EstablishmentPhoto_establishmentId_idx" ON "EstablishmentPhoto"("establishmentId");
CREATE INDEX "EstablishmentPhoto_isPrimary_idx" ON "EstablishmentPhoto"("isPrimary");

ALTER TABLE "EstablishmentPhoto" ADD CONSTRAINT "EstablishmentPhoto_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
