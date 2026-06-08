-- CreateEnum
CREATE TYPE "EstablishmentSubscriptionStatus" AS ENUM ('INCOMPLETE', 'INCOMPLETE_EXPIRED', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNPAID', 'PAUSED');

-- CreateEnum
CREATE TYPE "PublicationCreditStatus" AS ENUM ('PENDING_PAYMENT', 'AVAILABLE', 'RESERVED', 'CONSUMED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PublicationCreditSource" AS ENUM ('ONE_TIME_PAYMENT', 'ADMIN_GRANT');

-- CreateTable
CREATE TABLE "BillingCustomer" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstablishmentSubscription" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT NOT NULL,
    "stripePriceId" TEXT,
    "status" "EstablishmentSubscriptionStatus" NOT NULL,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstablishmentSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationCredit" (
    "id" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "missionId" TEXT,
    "source" "PublicationCreditSource" NOT NULL DEFAULT 'ONE_TIME_PAYMENT',
    "status" "PublicationCreditStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "amount" INTEGER NOT NULL DEFAULT 3999,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "reservedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB,

    CONSTRAINT "BillingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_establishmentId_key" ON "BillingCustomer"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCustomer_stripeCustomerId_key" ON "BillingCustomer"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentSubscription_establishmentId_key" ON "EstablishmentSubscription"("establishmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EstablishmentSubscription_stripeSubscriptionId_key" ON "EstablishmentSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "EstablishmentSubscription_status_idx" ON "EstablishmentSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationCredit_missionId_key" ON "PublicationCredit"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationCredit_stripeCheckoutSessionId_key" ON "PublicationCredit"("stripeCheckoutSessionId");

-- CreateIndex
CREATE INDEX "PublicationCredit_establishmentId_status_idx" ON "PublicationCredit"("establishmentId", "status");

-- CreateIndex
CREATE INDEX "PublicationCredit_stripePaymentIntentId_idx" ON "PublicationCredit"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_providerEventId_key" ON "BillingEvent"("providerEventId");

-- AddForeignKey
ALTER TABLE "BillingCustomer" ADD CONSTRAINT "BillingCustomer_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstablishmentSubscription" ADD CONSTRAINT "EstablishmentSubscription_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationCredit" ADD CONSTRAINT "PublicationCredit_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationCredit" ADD CONSTRAINT "PublicationCredit_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
