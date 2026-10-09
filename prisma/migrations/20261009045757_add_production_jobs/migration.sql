-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('QUEUED', 'PRINTING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ProductionJob" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "printerId" TEXT NOT NULL,
    "filamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ProductionStatus" NOT NULL DEFAULT 'QUEUED',
    "plannedWeightG" INTEGER NOT NULL,
    "actualWeightG" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionJob_companyId_status_idx" ON "ProductionJob"("companyId", "status");

-- CreateIndex
CREATE INDEX "ProductionJob_printerId_status_idx" ON "ProductionJob"("printerId", "status");

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionJob" ADD CONSTRAINT "ProductionJob_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
