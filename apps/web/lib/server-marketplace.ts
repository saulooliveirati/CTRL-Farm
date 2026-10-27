import "server-only";

import { cookies } from "next/headers";

export type MarketplaceSource =
  | "MERCADO_LIVRE"
  | "SHOPEE"
  | "TIKTOK_SHOP"
  | "AMAZON"
  | "ETSY"
  | "ALIEXPRESS"
  | "OTHER";

export type MarketplaceCategory3D =
  | "DECORATION"
  | "TOOLS_MOUNTS"
  | "COSPLAY_COLLECTIBLES"
  | "REPLACEMENT_PARTS"
  | "GARDEN_POTS"
  | "LIGHTING"
  | "FIDGET_TOYS"
  | "FASHION_ACCESSORIES"
  | "TABLETOP_GAMES"
  | "ORGANIZATION"
  | "OTHER";

export interface MarketplaceSnapshotRecord {
  id: string;
  capturedAt: string;
  date: string;
  price: number | string;
  estimatedSales: number;
  rating: number | null;
  reviewsCount: number;
  rankingPosition: number | null;
  salesPotential: number | null;
}

export interface MarketplaceProductRecord {
  id: string;
  source: MarketplaceSource;
  externalId: string;
  externalUrl: string;
  title: string;
  description: string | null;
  sellerName: string | null;
  sellerRating: number | null;
  sellerLocation: string | null;
  imageUrl: string | null;
  currentPrice: number | string;
  originalPrice: number | string | null;
  currency: string;
  estimatedMonthlySales: number;
  totalSalesCount: number;
  rating: number | null;
  reviewsCount: number;
  rankingPosition: number | null;
  searchKeyword: string | null;

  // Classificação & Enriquecimento IA
  is3DPrinted: boolean;
  aiConfidence: number;
  category3D: MarketplaceCategory3D;
  estimatedMaterial: string;
  manufacturingComplexity: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  estimatedWeightG: number | null;
  estimatedPrintTimeMinutes: number | null;
  targetAudience: string | null;
  seasonality: string | null;
  recommendedPrinters: string[];

  // Indicadores de Performance
  salesPotential: number;
  profitPotential: number;
  competitionLevel: "LOW" | "MEDIUM" | "HIGH" | "SATURATED";
  trend: "UP" | "STABLE" | "DOWN";
  marketSaturation: "LOW" | "MEDIUM" | "HIGH";
  manufacturingEase: "EASY" | "MODERATE" | "CHALLENGING";

  // Custos e Rentabilidade Estimada
  estimatedUnitCost: number | string | null;
  estimatedNetProfit: number | string | null;
  profitMarginPercent: number | string | null;

  lastScrapedAt: string;
  createdAt: string;
  updatedAt: string;
  snapshots?: MarketplaceSnapshotRecord[];
}

export interface MarketplaceMetricsRecord {
  totalMonitored: number;
  highOpportunityCount: number;
  upTrendCount: number;
  avgTicket: number;
  avgProfit: number;
  avgMarginPercent: number;
  byMarketplace: Array<{ source: MarketplaceSource; count: number }>;
  topCategories: Array<{ name: string; count: number }>;
  totalAnalyzed?: number;
  totalAnalyzedGrowth?: number;
  printed3DCount?: number;
  printed3DGrowth?: number;
  printed3DPercent?: number;
  highTrendCount?: number;
  highTrendGrowth?: number;
  avgSalesPotential?: number;
  avgSalesPotentialGrowth?: number;
  lastUpdateFormatted?: string;
  topCategoriesChart?: Array<{ name: string; percent: number; color: string }>;
  materialsDistribution?: Array<{ name: string; percent: number; color: string }>;
  marketTrendDays?: Array<{ date: string; value: number }>;
  lastSync?: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: string;
    totalProcessed: number;
    total3DDetected: number;
  } | null;
}

export interface MarketplaceAiResponse {
  query: string;
  intent: string;
  summary: string;
  actionableInsights: string[];
  recommendedStrategy: string;
  suggestedItems: Array<{
    id: string;
    title: string;
    source: string;
    currentPrice: number;
    estimatedNetProfit: number | null;
    salesPotential: number;
    profitPotential: number;
    competitionLevel: string;
    trend: string;
    estimatedMaterial: string;
    estimatedPrintTimeMinutes: number | null;
    estimatedWeightG: number | null;
    recommendedPrinters: string[];
  }>;
}

export async function getMarketplaceDataForPage(): Promise<{
  products: MarketplaceProductRecord[];
  metrics: MarketplaceMetricsRecord | null;
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { products: [], metrics: null, error: "Sessão ausente." };

  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

    const [productsRes, metricsRes] = await Promise.all([
      fetch(`${apiUrl}/marketplace/products?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${apiUrl}/marketplace/metrics`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ]);

    const productsResult = await productsRes.json();
    const metricsResult = await metricsRes.json();

    if (!productsRes.ok) {
      return {
        products: [],
        metrics: null,
        error: productsResult.message ?? "Não foi possível carregar o Marketplace Intelligence.",
      };
    }

    let productsList: MarketplaceProductRecord[] = [];
    if (Array.isArray(productsResult)) {
      productsList = productsResult;
    } else if (Array.isArray(productsResult?.data)) {
      productsList = productsResult.data;
    } else if (Array.isArray(productsResult?.data?.data)) {
      productsList = productsResult.data.data;
    }

    let metricsData: MarketplaceMetricsRecord | null = null;
    if (metricsRes.ok && metricsResult) {
      if (
        metricsResult.data &&
        typeof metricsResult.data === "object" &&
        "totalMonitored" in metricsResult.data
      ) {
        metricsData = metricsResult.data as MarketplaceMetricsRecord;
      } else if ("totalMonitored" in metricsResult) {
        metricsData = metricsResult as MarketplaceMetricsRecord;
      }
    }

    return {
      products: productsList,
      metrics: metricsData,
      error: "",
    };
  } catch (cause) {
    return {
      products: [],
      metrics: null,
      error: cause instanceof Error ? cause.message : "Falha na comunicação com o servidor.",
    };
  }
}
