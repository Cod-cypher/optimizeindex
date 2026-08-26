-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "accessCode" TEXT,
    "authorId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "serviceRadius" INTEGER,
    "industry" TEXT,
    "fleetSize" INTEGER,
    "truckTypes" JSONB,
    "heroImageUrl" TEXT,
    "logoImageUrl" TEXT,
    "currentCalls" INTEGER,
    "callSources" JSONB,
    "currentNotes" TEXT,
    "projectedCalls" INTEGER,
    "avgJobValue" INTEGER,
    "timeframeMonths" INTEGER,
    "projectionBasis" TEXT,
    "phases" JSONB,
    "deliverables" JSONB,
    "monthlyPrice" INTEGER,
    "setupFee" INTEGER,
    "termMonths" INTEGER,
    "ctaLabel" TEXT,
    "ctaUrl" TEXT,
    "customSections" JSONB,
    "adminNotes" TEXT,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalView" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerKey" TEXT,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "durationMs" INTEGER,
    "maxScrollPct" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "referrer" TEXT,

    CONSTRAINT "ProposalView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalEvent" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "viewerKey" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ProposalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_slug_key" ON "Proposal"("slug");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- CreateIndex
CREATE INDEX "Proposal_createdAt_idx" ON "Proposal"("createdAt");

-- CreateIndex
CREATE INDEX "Proposal_authorId_idx" ON "Proposal"("authorId");

-- CreateIndex
CREATE INDEX "ProposalView_proposalId_viewedAt_idx" ON "ProposalView"("proposalId", "viewedAt");

-- CreateIndex
CREATE INDEX "ProposalView_viewerKey_idx" ON "ProposalView"("viewerKey");

-- CreateIndex
CREATE INDEX "ProposalEvent_proposalId_createdAt_idx" ON "ProposalEvent"("proposalId", "createdAt");

-- CreateIndex
CREATE INDEX "ProposalEvent_name_idx" ON "ProposalEvent"("name");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalView" ADD CONSTRAINT "ProposalView_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalEvent" ADD CONSTRAINT "ProposalEvent_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

