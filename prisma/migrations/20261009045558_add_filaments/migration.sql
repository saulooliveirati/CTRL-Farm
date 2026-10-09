-- CreateEnum
CREATE TYPE "FilamentMaterial" AS ENUM ('PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'NYLON', 'PC', 'OTHER');

-- CreateTable
CREATE TABLE "Filament" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "material" "FilamentMaterial" NOT NULL,
    "brand" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "initialWeightG" INTEGER NOT NULL,
    "currentWeightG" INTEGER NOT NULL,
    "price" DECIMAL(10,2),
    "lot" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filament_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Filament_companyId_material_idx" ON "Filament"("companyId", "material");

-- AddForeignKey
ALTER TABLE "Filament" ADD CONSTRAINT "Filament_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
