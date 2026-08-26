-- CreateTable
CREATE TABLE "SavedTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "SavedTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedTemplate_createdAt_idx" ON "SavedTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "SavedTemplate_authorId_idx" ON "SavedTemplate"("authorId");

-- AddForeignKey
ALTER TABLE "SavedTemplate" ADD CONSTRAINT "SavedTemplate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

