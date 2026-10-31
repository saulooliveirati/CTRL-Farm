-- Extend printer records with the catalog details shown in the equipment view.
ALTER TABLE "Printer"
  ADD COLUMN "nozzleMm" DECIMAL(4,2) NOT NULL DEFAULT 0.4,
  ADD COLUMN "extruderCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "usageHours" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "imageUrl" TEXT;
