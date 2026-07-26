ALTER TABLE "BillingEvent"
  ALTER COLUMN "processedAt" DROP DEFAULT,
  ALTER COLUMN "processedAt" DROP NOT NULL,
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" TEXT;

CREATE INDEX "BillingEvent_processedAt_failedAt_idx"
ON "BillingEvent" ("processedAt", "failedAt");

ALTER TABLE "EstablishmentSubscription"
  ADD COLUMN "stripeEventCreatedAt" TIMESTAMP(3);

-- Historical webhook payloads can contain customer details that are not needed
-- for idempotency or audit. Keep only event metadata going forward.
UPDATE "BillingEvent" SET "payload" = NULL;
