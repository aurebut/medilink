CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "organization" TEXT,
    "role" TEXT NOT NULL,
    "interests" TEXT[],
    "message" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemoRequest_createdAt_idx" ON "DemoRequest"("createdAt");
ALTER TABLE "DemoRequest" ENABLE ROW LEVEL SECURITY;
