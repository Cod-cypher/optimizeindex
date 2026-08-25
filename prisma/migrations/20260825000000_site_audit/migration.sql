-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "auditId" TEXT;

-- CreateTable
CREATE TABLE "SiteAudit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "domain" TEXT NOT NULL,
    "overallScore" INTEGER,
    "technicalScore" INTEGER,
    "contentScore" INTEGER,
    "performanceScore" INTEGER,
    "geoScore" INTEGER,
    "psiFetched" BOOLEAN NOT NULL DEFAULT false,
    "lcpMs" INTEGER,
    "clsScore" DOUBLE PRECISION,
    "inpMs" INTEGER,
    "cwvSource" TEXT,
    "checks" JSONB,
    "errorCode" TEXT,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "leadEmail" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "durationMs" INTEGER,

    CONSTRAINT "SiteAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteAudit_domain_idx" ON "SiteAudit"("domain");

-- CreateIndex
CREATE INDEX "SiteAudit_createdAt_idx" ON "SiteAudit"("createdAt");

-- CreateIndex
CREATE INDEX "SiteAudit_leadEmail_idx" ON "SiteAudit"("leadEmail");

-- CreateIndex
CREATE INDEX "SiteAudit_visitorId_idx" ON "SiteAudit"("visitorId");

-- CreateIndex
CREATE INDEX "Lead_auditId_idx" ON "Lead"("auditId");

