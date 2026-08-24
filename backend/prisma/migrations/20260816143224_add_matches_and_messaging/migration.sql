-- CreateEnum
CREATE TYPE "MatchSport" AS ENUM ('TENNIS', 'PADEL');

-- CreateEnum
CREATE TYPE "MatchFormat" AS ENUM ('SINGLES', 'DOUBLES');

-- CreateEnum
CREATE TYPE "MatchState" AS ENUM ('PROPOSED', 'SCHEDULING', 'SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'EXPIRED', 'COMPLETED', 'WALKOVER', 'RETIRED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "MatchSide" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "ParticipantRole" AS ENUM ('CHALLENGER', 'OPPONENT', 'PARTNER');

-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "TimeProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'MATCH');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'SYSTEM');

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "sport" "MatchSport" NOT NULL DEFAULT 'TENNIS',
    "format" "MatchFormat" NOT NULL DEFAULT 'SINGLES',
    "state" "MatchState" NOT NULL DEFAULT 'PROPOSED',
    "createdById" TEXT NOT NULL,
    "confirmedTime" TIMESTAMP(3),
    "courtName" TEXT,
    "courtNote" TEXT,
    "proposalRound" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "side" "MatchSide" NOT NULL,
    "role" "ParticipantRole" NOT NULL,
    "status" "ParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_proposals" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "status" "TimeProposalStatus" NOT NULL DEFAULT 'PENDING',
    "respondedById" TEXT,
    "respondedAt" TIMESTAMP(3),
    "acceptedOptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_proposal_options" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_proposal_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "type" "ConversationType" NOT NULL DEFAULT 'DIRECT',
    "matchId" TEXT,
    "lastMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT,
    "kind" "MessageKind" NOT NULL DEFAULT 'TEXT',
    "body" TEXT NOT NULL,
    "systemEvent" TEXT,
    "relatedMatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "matches_state_idx" ON "matches"("state");

-- CreateIndex
CREATE INDEX "match_participants_userId_status_idx" ON "match_participants"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_matchId_userId_key" ON "match_participants"("matchId", "userId");

-- CreateIndex
CREATE INDEX "time_proposals_matchId_status_idx" ON "time_proposals"("matchId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_matchId_key" ON "conversations"("matchId");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_proposals" ADD CONSTRAINT "time_proposals_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_proposals" ADD CONSTRAINT "time_proposals_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_proposals" ADD CONSTRAINT "time_proposals_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_proposal_options" ADD CONSTRAINT "time_proposal_options_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "time_proposals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
