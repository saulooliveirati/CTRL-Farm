-- CreateTable
CREATE TABLE "ProjectFile" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productionJobId" TEXT,
    "projectName" TEXT NOT NULL,
    "version" TEXT,
    "category" TEXT NOT NULL DEFAULT 'MODEL',
    "description" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingEstimate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "materialCost" DECIMAL(10,2) NOT NULL,
    "machineCost" DECIMAL(10,2) NOT NULL,
    "laborCost" DECIMAL(10,2) NOT NULL,
    "additionalCost" DECIMAL(10,2) NOT NULL,
    "wastePercent" DECIMAL(5,2) NOT NULL,
    "marketplaceFeePercent" DECIMAL(5,2) NOT NULL,
    "paymentFeePercent" DECIMAL(5,2) NOT NULL,
    "taxPercent" DECIMAL(5,2) NOT NULL,
    "marginPercent" DECIMAL(5,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "suggestedPrice" DECIMAL(10,2) NOT NULL,
    "estimatedProfit" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProjectFile_storedName_key" ON "ProjectFile"("storedName");

-- CreateIndex
CREATE INDEX "ProjectFile_companyId_projectName_idx" ON "ProjectFile"("companyId", "projectName");

-- CreateIndex
CREATE INDEX "ProjectFile_productionJobId_idx" ON "ProjectFile"("productionJobId");

-- CreateIndex
CREATE INDEX "PricingEstimate_companyId_createdAt_idx" ON "PricingEstimate"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFile" ADD CONSTRAINT "ProjectFile_productionJobId_fkey" FOREIGN KEY ("productionJobId") REFERENCES "ProductionJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingEstimate" ADD CONSTRAINT "PricingEstimate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
