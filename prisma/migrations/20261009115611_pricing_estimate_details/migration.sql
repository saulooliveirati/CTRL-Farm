-- AlterTable
ALTER TABLE "PricingEstimate" ADD COLUMN     "electricityPrice" DECIMAL(10,3) NOT NULL DEFAULT 1,
ADD COLUMN     "filamentLines" JSONB,
ADD COLUMN     "laborRatePerHour" DECIMAL(10,2) NOT NULL DEFAULT 2.5,
ADD COLUMN     "machineRatePerHour" DECIMAL(10,2) NOT NULL DEFAULT 1.5,
ADD COLUMN     "marginType" TEXT NOT NULL DEFAULT 'MARGIN',
ADD COLUMN     "marketplace" TEXT,
ADD COLUMN     "powerKw" DECIMAL(7,3) NOT NULL DEFAULT 0.35,
ADD COLUMN     "printDurationMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "printerId" TEXT,
ADD COLUMN     "printerName" TEXT,
ADD COLUMN     "supplyLines" JSONB;

-- AddForeignKey
ALTER TABLE "PricingEstimate" ADD CONSTRAINT "PricingEstimate_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
