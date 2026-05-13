-- CreateEnum
CREATE TYPE "MissionAgreementStatus" AS ENUM ('PROPOSED', 'PAYMENT_REQUIRED', 'FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED', 'REJECTED', 'CANCELLED', 'DISPUTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EscrowPaymentStatus" AS ENUM ('REQUIRES_PAYMENT', 'SECURED', 'RELEASED', 'REFUNDED', 'FAILED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('RECRUITER_INVOICE', 'CANDIDATE_RECEIPT');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('GENERATED', 'VOID');

-- CreateEnum
CREATE TYPE "AgreementEventType" AS ENUM ('PROPOSAL_SENT', 'PROPOSAL_ACCEPTED', 'PROPOSAL_REJECTED', 'PAYMENT_REQUIRED', 'FUNDS_SECURED', 'MISSION_COMPLETED', 'PAYMENT_RELEASED', 'INVOICES_GENERATED');

-- CreateTable
CREATE TABLE "MissionAgreement" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "candidateUserId" TEXT NOT NULL,
    "establishmentId" TEXT NOT NULL,
    "status" "MissionAgreementStatus" NOT NULL DEFAULT 'PROPOSED',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "platformFee" INTEGER NOT NULL DEFAULT 0,
    "candidateAmount" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "terms" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MissionAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowPayment" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "status" "EscrowPaymentStatus" NOT NULL DEFAULT 'REQUIRES_PAYMENT',
    "provider" TEXT NOT NULL DEFAULT 'mock',
    "providerRef" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "securedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "paymentId" TEXT,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'GENERATED',
    "number" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "pdfUrl" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementEvent" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "type" "AgreementEventType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MissionAgreement_conversationId_createdAt_idx" ON "MissionAgreement"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "MissionAgreement_status_idx" ON "MissionAgreement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowPayment_agreementId_key" ON "EscrowPayment"("agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_agreementId_idx" ON "Invoice"("agreementId");

-- CreateIndex
CREATE INDEX "AgreementEvent_agreementId_createdAt_idx" ON "AgreementEvent"("agreementId", "createdAt");

-- CreateIndex
CREATE INDEX "AgreementEvent_conversationId_createdAt_idx" ON "AgreementEvent"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "MissionAgreement" ADD CONSTRAINT "MissionAgreement_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAgreement" ADD CONSTRAINT "MissionAgreement_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAgreement" ADD CONSTRAINT "MissionAgreement_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowPayment" ADD CONSTRAINT "EscrowPayment_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "MissionAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "MissionAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementEvent" ADD CONSTRAINT "AgreementEvent_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "MissionAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementEvent" ADD CONSTRAINT "AgreementEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementEvent" ADD CONSTRAINT "AgreementEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
