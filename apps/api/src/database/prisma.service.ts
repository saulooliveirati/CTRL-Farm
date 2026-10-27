import { Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    await this.ensureDynamicTables();
  }

  private async ensureDynamicTables() {
    try {
      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "WorkshopEquipment" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "tabKey" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "brand" TEXT,
          "model" TEXT,
          "serialNumber" TEXT,
          "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
          "powerWatts" INTEGER,
          "acquisitionDate" TIMESTAMP(3),
          "purchasePrice" DECIMAL(10, 2),
          "hourlyCost" DECIMAL(10, 2),
          "location" TEXT,
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "CustomSectionTab" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "section" TEXT NOT NULL,
          "key" TEXT NOT NULL,
          "label" TEXT NOT NULL,
          "icon" TEXT,
          "order" INTEGER NOT NULL DEFAULT 0,
          "isDefault" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Product" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "sku" TEXT,
          "name" TEXT NOT NULL,
          "category" TEXT,
          "imageUrl" TEXT,
          "quantity" INTEGER NOT NULL DEFAULT 0,
          "minQuantity" INTEGER NOT NULL DEFAULT 0,
          "costPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0,
          "sellingPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0,
          "weightGrams" INTEGER,
          "dimensions" TEXT,
          "status" TEXT NOT NULL DEFAULT 'IN_STOCK',
          "notes" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "LgpdConsentLog" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "userName" TEXT,
          "userEmail" TEXT,
          "termVersion" TEXT NOT NULL DEFAULT '1.0',
          "accepted" BOOLEAN NOT NULL DEFAULT true,
          "ipAddress" TEXT,
          "userAgent" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await this.$executeRawUnsafe(`
        ALTER TABLE "Printer" ADD COLUMN IF NOT EXISTS "previousStatus" TEXT;
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketplaceProduct" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT,
          "source" TEXT NOT NULL DEFAULT 'MERCADO_LIVRE',
          "externalId" TEXT NOT NULL,
          "externalUrl" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "description" TEXT,
          "sellerName" TEXT,
          "sellerRating" DOUBLE PRECISION,
          "sellerLocation" TEXT,
          "imageUrl" TEXT,
          "currentPrice" DECIMAL(10, 2) NOT NULL,
          "originalPrice" DECIMAL(10, 2),
          "currency" TEXT NOT NULL DEFAULT 'BRL',
          "estimatedMonthlySales" INTEGER NOT NULL DEFAULT 0,
          "totalSalesCount" INTEGER NOT NULL DEFAULT 0,
          "rating" DOUBLE PRECISION,
          "reviewsCount" INTEGER NOT NULL DEFAULT 0,
          "rankingPosition" INTEGER,
          "searchKeyword" TEXT,
          "is3DPrinted" BOOLEAN NOT NULL DEFAULT true,
          "aiConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
          "category3D" TEXT NOT NULL DEFAULT 'OTHER',
          "estimatedMaterial" TEXT NOT NULL DEFAULT 'PLA',
          "manufacturingComplexity" TEXT NOT NULL DEFAULT 'MEDIUM',
          "estimatedWeightG" DOUBLE PRECISION,
          "estimatedPrintTimeMinutes" INTEGER,
          "targetAudience" TEXT,
          "seasonality" TEXT,
          "recommendedPrinters" TEXT[] DEFAULT ARRAY[]::TEXT[],
          "salesPotential" INTEGER NOT NULL DEFAULT 50,
          "profitPotential" INTEGER NOT NULL DEFAULT 50,
          "competitionLevel" TEXT NOT NULL DEFAULT 'MEDIUM',
          "trend" TEXT NOT NULL DEFAULT 'STABLE',
          "marketSaturation" TEXT NOT NULL DEFAULT 'MEDIUM',
          "manufacturingEase" TEXT NOT NULL DEFAULT 'MODERATE',
          "estimatedUnitCost" DECIMAL(10, 2),
          "estimatedNetProfit" DECIMAL(10, 2),
          "profitMarginPercent" DECIMAL(5, 2),
          "lastScrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "MarketplaceProduct_source_externalId_key" UNIQUE ("source", "externalId")
        );
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketplaceProductSnapshot" (
          "id" TEXT PRIMARY KEY,
          "productId" TEXT NOT NULL REFERENCES "MarketplaceProduct"("id") ON DELETE CASCADE,
          "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "price" DECIMAL(10, 2) NOT NULL,
          "estimatedSales" INTEGER NOT NULL DEFAULT 0,
          "rating" DOUBLE PRECISION,
          "reviewsCount" INTEGER NOT NULL DEFAULT 0,
          "rankingPosition" INTEGER,
          "salesPotential" INTEGER
        );
      `);

      await this.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MarketplaceSyncLog" (
          "id" TEXT PRIMARY KEY,
          "companyId" TEXT,
          "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "finishedAt" TIMESTAMP(3),
          "status" TEXT NOT NULL DEFAULT 'RUNNING',
          "marketplace" TEXT NOT NULL DEFAULT 'ALL',
          "totalProcessed" INTEGER NOT NULL DEFAULT 0,
          "total3DDetected" INTEGER NOT NULL DEFAULT 0,
          "details" JSONB,
          "triggeredBy" TEXT NOT NULL DEFAULT 'MANUAL',
          "errorMessage" TEXT
        );
      `);
      this.logger.log("Tabelas dinâmicas do CTRL+Farm validadas e prontas.");
    } catch (err) {
      this.logger.warn(`Aviso na inicialização das tabelas dinâmicas: ${err}`);
    }
  }
}
