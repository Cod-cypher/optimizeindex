-- CreateEnum
CREATE TYPE "ChatStatus" AS ENUM ('ACTIVE', 'HANDOFF_PENDING', 'LIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('VISITOR', 'ASSISTANT', 'AGENT', 'SYSTEM');

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ChatStatus" NOT NULL DEFAULT 'ACTIVE',
    "visitorId" TEXT,
    "sessionId" TEXT,
    "gaClientId" TEXT,
    "startedOn" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "country" TEXT,
    "visitorName" TEXT,
    "visitorEmail" TEXT,
    "visitorPhone" TEXT,
    "visitorCompany" TEXT,
    "visitorWebsite" TEXT,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "qualifiedReason" TEXT,
    "handoffRequestedAt" TIMESTAMP(3),
    "handoffReason" TEXT,
    "handoffEmailSentAt" TIMESTAMP(3),
    "agentJoinedAt" TIMESTAMP(3),
    "agentLabel" TEXT,
    "agentTokenId" TEXT,
    "agentTokenExpiresAt" TIMESTAMP(3),
    "agentFirstSeenAt" TIMESTAMP(3),
    "agentIpAddress" TEXT,
    "leadId" TEXT,
    "auditId" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedReason" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "turnCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seq" SERIAL NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'message',
    "authorLabel" TEXT,
    "toolName" TEXT,
    "toolArgs" JSONB,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_agentTokenId_key" ON "ChatConversation"("agentTokenId");

-- CreateIndex
CREATE INDEX "ChatConversation_status_lastMessageAt_idx" ON "ChatConversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "ChatConversation_visitorId_idx" ON "ChatConversation"("visitorId");

-- CreateIndex
CREATE INDEX "ChatConversation_createdAt_idx" ON "ChatConversation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_seq_key" ON "ChatMessage"("seq");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_seq_idx" ON "ChatMessage"("conversationId", "seq");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

