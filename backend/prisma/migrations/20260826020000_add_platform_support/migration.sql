-- Phase 5J: platform-admin support queues and privacy requests.
-- Migration source only; execution is deferred to the consolidated QA pass.

CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'RESOLVED');
CREATE TYPE "SupportTicketPriority" AS ENUM ('NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "SupportTicketCategory" AS ENUM ('ACCOUNT', 'BILLING', 'MATCHES', 'CLUBS', 'TECHNICAL', 'OTHER');
CREATE TYPE "PrivacyRequestType" AS ENUM ('EXPORT', 'DELETION');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('PENDING', 'FULFILLED');

CREATE TABLE "support_tickets" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "SupportTicketCategory" NOT NULL DEFAULT 'OTHER',
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "support_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "privacy_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requestNote" TEXT,
    "fulfillmentNote" TEXT,
    "exportSnapshot" JSONB,
    "processedById" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "support_tickets_status_priority_createdAt_idx"
  ON "support_tickets"("status", "priority", "createdAt");
CREATE INDEX "support_tickets_userId_createdAt_idx"
  ON "support_tickets"("userId", "createdAt");
CREATE INDEX "support_tickets_assignedToId_status_idx"
  ON "support_tickets"("assignedToId", "status");
CREATE INDEX "support_ticket_messages_ticketId_createdAt_idx"
  ON "support_ticket_messages"("ticketId", "createdAt");
CREATE INDEX "support_ticket_messages_actorId_createdAt_idx"
  ON "support_ticket_messages"("actorId", "createdAt");
CREATE INDEX "privacy_requests_status_type_createdAt_idx"
  ON "privacy_requests"("status", "type", "createdAt");
CREATE INDEX "privacy_requests_userId_status_idx"
  ON "privacy_requests"("userId", "status");

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_resolvedById_fkey"
  FOREIGN KEY ("resolvedById") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages"
  ADD CONSTRAINT "support_ticket_messages_ticketId_fkey"
  FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_ticket_messages"
  ADD CONSTRAINT "support_ticket_messages_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "platform_admins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "privacy_requests"
  ADD CONSTRAINT "privacy_requests_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "privacy_requests"
  ADD CONSTRAINT "privacy_requests_processedById_fkey"
  FOREIGN KEY ("processedById") REFERENCES "platform_admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
