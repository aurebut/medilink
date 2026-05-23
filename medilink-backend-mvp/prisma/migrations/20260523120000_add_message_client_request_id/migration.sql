ALTER TABLE "Message" ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "Message_conversationId_senderUserId_clientRequestId_key"
ON "Message"("conversationId", "senderUserId", "clientRequestId");
