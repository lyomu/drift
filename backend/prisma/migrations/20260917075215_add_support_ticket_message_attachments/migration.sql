-- CreateTable
CREATE TABLE "support_ticket_message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_ticket_message_attachments_messageId_idx" ON "support_ticket_message_attachments"("messageId");

-- AddForeignKey
ALTER TABLE "support_ticket_message_attachments" ADD CONSTRAINT "support_ticket_message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "support_ticket_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
