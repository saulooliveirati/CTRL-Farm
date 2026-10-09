-- AlterTable
ALTER TABLE "ProductionJob" ADD COLUMN     "activeSince" TIMESTAMP(3),
ADD COLUMN     "actualDurationSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "plannedDurationMinutes" INTEGER;
