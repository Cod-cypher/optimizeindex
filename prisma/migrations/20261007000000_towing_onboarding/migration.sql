-- CreateTable
CREATE TABLE "TowingOnboarding" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessName" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "website" TEXT,
    "contactName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "truckCount" TEXT NOT NULL,
    "services" TEXT[],
    "truckTypes" TEXT[],
    "cannotHandle" TEXT,
    "zipListStatus" TEXT NOT NULL,
    "zipCodes" TEXT,
    "radius" TEXT,
    "excludedAreas" TEXT,
    "hours" TEXT NOT NULL,
    "afterHours" TEXT,
    "callAnswerer" TEXT NOT NULL,
    "callRouting" TEXT,
    "wantedJobs" TEXT[],
    "hasProfile" TEXT,
    "profileLink" TEXT,
    "profileAccess" TEXT NOT NULL,
    "notes" TEXT,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "submittedFrom" TEXT,
    "visitorId" TEXT,
    "sessionId" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "emailForwarded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TowingOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TowingOnboarding_createdAt_idx" ON "TowingOnboarding"("createdAt");

-- CreateIndex
CREATE INDEX "TowingOnboarding_email_idx" ON "TowingOnboarding"("email");

