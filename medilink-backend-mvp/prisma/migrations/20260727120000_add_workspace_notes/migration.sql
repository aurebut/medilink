CREATE TABLE "WorkspaceNote" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "establishmentId" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceNote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkspaceNote_exactly_one_owner_check"
      CHECK (
        ("ownerUserId" IS NOT NULL AND "establishmentId" IS NULL)
        OR
        ("ownerUserId" IS NULL AND "establishmentId" IS NOT NULL)
      )
);

CREATE UNIQUE INDEX "WorkspaceNote_ownerUserId_key_key"
  ON "WorkspaceNote"("ownerUserId", "key");
CREATE UNIQUE INDEX "WorkspaceNote_establishmentId_key_key"
  ON "WorkspaceNote"("establishmentId", "key");
CREATE INDEX "WorkspaceNote_ownerUserId_idx" ON "WorkspaceNote"("ownerUserId");
CREATE INDEX "WorkspaceNote_establishmentId_idx" ON "WorkspaceNote"("establishmentId");
CREATE INDEX "WorkspaceNote_key_idx" ON "WorkspaceNote"("key");

ALTER TABLE "WorkspaceNote"
  ADD CONSTRAINT "WorkspaceNote_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceNote"
  ADD CONSTRAINT "WorkspaceNote_establishmentId_fkey"
  FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
