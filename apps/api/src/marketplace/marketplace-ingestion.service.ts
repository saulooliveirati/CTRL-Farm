import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { ConnectorRegistryService } from "./connectors/connector-registry.service.js";
import type { MarketplaceSource, RawMarketplaceListing } from "./connectors/connector.interface.js";
import { MarketplaceClassifierService } from "./marketplace-classifier.service.js";

export interface SyncOptions {
  companyId?: string;
  marketplace?: string; // 'ALL' or specific source
  keywords?: string[];
  triggeredBy?: "CRON" | "MANUAL" | "AI_AGENT";
}

@Injectable()
export class MarketplaceIngestionService {
  private readonly logger = new Logger(MarketplaceIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorRegistry: ConnectorRegistryService,
    private readonly classifier: MarketplaceClassifierService,
  ) {}

  async runSync(options?: SyncOptions) {
    const startedAt = new Date();
    const targetMarketplace = options?.marketplace || "ALL";
    const triggeredBy = options?.triggeredBy || "MANUAL";
    const keywords = options?.keywords || [
      "impressão 3d",
      "suporte 3d",
      "vaso 3d",
      "fidget toy 3d",
      "peça reposição 3d",
    ];

    this.logger.log(
      `Iniciando Ingestion Pipeline do Marketplace Intelligence. Origem: ${targetMarketplace}, Disparado por: ${triggeredBy}`,
    );

    // Cria registro de log inicial
    const log = await this.prisma.marketplaceSyncLog.create({
      data: {
        companyId: options?.companyId || null,
        startedAt,
        status: "RUNNING",
        marketplace: targetMarketplace,
        triggeredBy,
      },
    });

    let totalProcessed = 0;
    let total3DDetected = 0;
    const errors: Array<{ marketplace: string; error: string }> = [];

    try {
      // 1. Identificar conectores alvos
      const activeConnectors =
        targetMarketplace === "ALL"
          ? this.connectorRegistry.getAllConnectors()
          : [this.connectorRegistry.getConnector(targetMarketplace as MarketplaceSource)].filter(
              Boolean,
            );

      // 2. Coletar listings de todos os conectores
      const rawListings: RawMarketplaceListing[] = [];

      for (const connector of activeConnectors) {
        if (!connector) continue;
        for (const kw of keywords) {
          try {
            const results = await connector.search(kw, { limit: 25 });
            rawListings.push(...results);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Erro ao consultar ${connector.name} para "${kw}": ${errorMsg}`);
            errors.push({ marketplace: connector.id, error: errorMsg });
          }
        }
      }

      // 3. Deduplicação intra-pipeline por (source + externalId) e por título normalizado
      const deduplicatedListings = this.deduplicate(rawListings);
      totalProcessed = deduplicatedListings.length;

      // 4. Processamento, classificação e persistência
      for (const raw of deduplicatedListings) {
        const enriched = this.classifier.classifyAndEnrich(raw);
        if (!enriched.is3DPrinted) {
          continue;
        }

        total3DDetected++;

        // Upsert do Produto
        const product = await this.prisma.marketplaceProduct.upsert({
          where: {
            source_externalId: {
              source: raw.source as any,
              externalId: raw.externalId,
            },
          },
          update: {
            currentPrice: raw.currentPrice,
            originalPrice: raw.originalPrice || null,
            estimatedMonthlySales: raw.estimatedMonthlySales,
            totalSalesCount: raw.totalSalesCount,
            rating: raw.rating || null,
            reviewsCount: raw.reviewsCount,
            rankingPosition: raw.rankingPosition || null,
            searchKeyword: raw.searchKeyword || null,
            lastScrapedAt: new Date(),
            // Indicadores atualizados
            salesPotential: enriched.salesPotential,
            profitPotential: enriched.profitPotential,
            competitionLevel: enriched.competitionLevel as any,
            trend: enriched.trend as any,
            marketSaturation: enriched.marketSaturation,
            manufacturingEase: enriched.manufacturingEase,
            estimatedUnitCost: enriched.estimatedUnitCost,
            estimatedNetProfit: enriched.estimatedNetProfit,
            profitMarginPercent: enriched.profitMarginPercent,
          },
          create: {
            companyId: options?.companyId || null,
            source: raw.source as any,
            externalId: raw.externalId,
            externalUrl: raw.externalUrl,
            title: raw.title,
            description: raw.description || null,
            sellerName: raw.sellerName || null,
            sellerRating: raw.sellerRating || null,
            sellerLocation: raw.sellerLocation || null,
            imageUrl: raw.imageUrl || null,
            currentPrice: raw.currentPrice,
            originalPrice: raw.originalPrice || null,
            currency: raw.currency || "BRL",
            estimatedMonthlySales: raw.estimatedMonthlySales,
            totalSalesCount: raw.totalSalesCount,
            rating: raw.rating || null,
            reviewsCount: raw.reviewsCount,
            rankingPosition: raw.rankingPosition || null,
            searchKeyword: raw.searchKeyword || null,
            is3DPrinted: enriched.is3DPrinted,
            aiConfidence: enriched.aiConfidence,
            category3D: enriched.category3D as any,
            estimatedMaterial: enriched.estimatedMaterial as any,
            manufacturingComplexity: enriched.manufacturingComplexity,
            estimatedWeightG: enriched.estimatedWeightG,
            estimatedPrintTimeMinutes: enriched.estimatedPrintTimeMinutes,
            targetAudience: enriched.targetAudience,
            seasonality: enriched.seasonality,
            recommendedPrinters: enriched.recommendedPrinters,
            salesPotential: enriched.salesPotential,
            profitPotential: enriched.profitPotential,
            competitionLevel: enriched.competitionLevel as any,
            trend: enriched.trend as any,
            marketSaturation: enriched.marketSaturation,
            manufacturingEase: enriched.manufacturingEase,
            estimatedUnitCost: enriched.estimatedUnitCost,
            estimatedNetProfit: enriched.estimatedNetProfit,
            profitMarginPercent: enriched.profitMarginPercent,
          },
        });

        // Registrar Snapshot Diário para histórico
        await this.prisma.marketplaceProductSnapshot.create({
          data: {
            productId: product.id,
            capturedAt: new Date(),
            date: new Date(),
            price: raw.currentPrice,
            estimatedSales: raw.estimatedMonthlySales,
            rating: raw.rating || null,
            reviewsCount: raw.reviewsCount,
            rankingPosition: raw.rankingPosition || null,
            salesPotential: enriched.salesPotential,
          },
        });
      }

      // Finalizar log
      await this.prisma.marketplaceSyncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: errors.length > 0 ? "PARTIAL_FAILURE" : "SUCCESS",
          totalProcessed,
          total3DDetected,
          details: { errors, syncDurationMs: Date.now() - startedAt.getTime() },
        },
      });

      this.logger.log(
        `Sync concluído com sucesso: ${totalProcessed} anúncios processados, ${total3DDetected} confirmados como 3D.`,
      );

      return {
        success: true,
        logId: log.id,
        totalProcessed,
        total3DDetected,
        errors,
      };
    } catch (criticalError) {
      const errorMsg =
        criticalError instanceof Error ? criticalError.message : String(criticalError);
      this.logger.error(`Falha crítica no pipeline: ${errorMsg}`);

      await this.prisma.marketplaceSyncLog.update({
        where: { id: log.id },
        data: {
          finishedAt: new Date(),
          status: "FAILED",
          errorMessage: errorMsg,
          totalProcessed,
          total3DDetected,
        },
      });

      throw criticalError;
    }
  }

  private deduplicate(listings: RawMarketplaceListing[]): RawMarketplaceListing[] {
    const seenExternalIds = new Set<string>();
    const seenTitles = new Set<string>();
    const unique: RawMarketplaceListing[] = [];

    for (const item of listings) {
      const externalKey = `${item.source}:${item.externalId}`;
      const normalizedTitle = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 70);

      if (seenExternalIds.has(externalKey) || seenTitles.has(normalizedTitle)) {
        continue;
      }

      seenExternalIds.add(externalKey);
      seenTitles.add(normalizedTitle);
      unique.push(item);
    }

    return unique;
  }
}
