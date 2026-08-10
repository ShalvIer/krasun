-- CreateTable
CREATE TABLE "MessageEmailNotification" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "MessageEmailNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MessageEmailNotification_messageId_recipientId_key" ON "MessageEmailNotification"("messageId", "recipientId");

-- CreateIndex
CREATE INDEX "MessageEmailNotification_recipientId_createdAt_idx" ON "MessageEmailNotification"("recipientId", "createdAt");

-- CreateIndex
CREATE INDEX "MessageEmailNotification_status_createdAt_idx" ON "MessageEmailNotification"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "MessageEmailNotification" ADD CONSTRAINT "MessageEmailNotification_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageEmailNotification" ADD CONSTRAINT "MessageEmailNotification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
