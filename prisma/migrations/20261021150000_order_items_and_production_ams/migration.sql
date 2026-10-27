-- Drop the unique constraint on ProductionJob(orderId) so multiple jobs can belong to one order
DROP INDEX IF EXISTS "ProductionJob_orderId_key";
CREATE INDEX "ProductionJob_orderId_idx" ON "ProductionJob"("orderId");

-- Alter CustomerOrder to add totalAmount
ALTER TABLE "CustomerOrder" ADD COLUMN "totalAmount" DECIMAL(10,2);

-- Create OrderItem table
CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- Create ProductionJobFilament table (AMS / Multicolor Support)
CREATE TABLE "ProductionJobFilament" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "filamentId" TEXT NOT NULL,
  "slotNumber" INTEGER DEFAULT 1,
  "plannedWeightG" INTEGER NOT NULL,
  "actualWeightG" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductionJobFilament_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductionJobFilament_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ProductionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ProductionJobFilament_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ProductionJobFilament_jobId_filamentId_key" ON "ProductionJobFilament"("jobId", "filamentId");
CREATE INDEX "ProductionJobFilament_jobId_idx" ON "ProductionJobFilament"("jobId");
CREATE INDEX "ProductionJobFilament_filamentId_idx" ON "ProductionJobFilament"("filamentId");

-- Alter Printer to add hardware telemetry columns
ALTER TABLE "Printer" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "Printer" ADD COLUMN "protocol" TEXT;
ALTER TABLE "Printer" ADD COLUMN "accessCode" TEXT;
ALTER TABLE "Printer" ADD COLUMN "port" INTEGER;
ALTER TABLE "Printer" ADD COLUMN "bedTemp" DECIMAL(5,2);
ALTER TABLE "Printer" ADD COLUMN "targetBedTemp" DECIMAL(5,2);
ALTER TABLE "Printer" ADD COLUMN "nozzleTemp" DECIMAL(5,2);
ALTER TABLE "Printer" ADD COLUMN "targetNozzleTemp" DECIMAL(5,2);
ALTER TABLE "Printer" ADD COLUMN "progressPercent" DECIMAL(5,2);
ALTER TABLE "Printer" ADD COLUMN "currentLayer" INTEGER;
ALTER TABLE "Printer" ADD COLUMN "totalLayers" INTEGER;
ALTER TABLE "Printer" ADD COLUMN "lastTelemetryAt" TIMESTAMP(3);
