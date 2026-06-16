-- Create matching configuration table
CREATE TABLE "MatchingConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "version" INTEGER NOT NULL DEFAULT 1,
  "weights" JSONB NOT NULL,
  "thresholds" JSONB NOT NULL,
  "exclusions" JSONB NOT NULL,
  "dispatch" JSONB NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MatchingConfiguration_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MatchingConfiguration"
  ADD CONSTRAINT "MatchingConfiguration_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
