-- CreateEnum
CREATE TYPE "PrinterStatus" AS ENUM ('READY', 'PRINTING', 'PAUSED', 'ERROR', 'MAINTENANCE', 'OFFLINE');

-- CreateTable
CREATE TABLE "Printer" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "status" "PrinterStatus" NOT NULL DEFAULT 'OFFLINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Printer_companyId_status_idx" ON "Printer"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Printer_companyId_name_key" ON "Printer"("companyId", "name");

-- AddForeignKey
ALTER TABLE "Printer" ADD CONSTRAINT "Printer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
