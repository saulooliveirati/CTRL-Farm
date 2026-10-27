export type MarketplaceSource =
  | "MERCADO_LIVRE"
  | "SHOPEE"
  | "TIKTOK_SHOP"
  | "AMAZON"
  | "ETSY"
  | "ALIEXPRESS"
  | "OTHER";

export interface RawMarketplaceListing {
  source: MarketplaceSource;
  externalId: string;
  externalUrl: string;
  title: string;
  description?: string;
  sellerName?: string;
  sellerRating?: number;
  sellerLocation?: string;
  imageUrl?: string;
  currentPrice: number;
  originalPrice?: number;
  currency: string;
  estimatedMonthlySales: number;
  totalSalesCount: number;
  rating?: number;
  reviewsCount: number;
  rankingPosition?: number;
  searchKeyword?: string;
  tags?: string[];
  rawAttributes?: Record<string, unknown>;
}

export interface ConnectorSearchOptions {
  limit?: number;
  category?: string;
  sortBy?: "relevance" | "sales" | "price_asc" | "price_desc";
  minPrice?: number;
  maxPrice?: number;
}

export interface MarketplaceConnector {
  readonly id: MarketplaceSource;
  readonly name: string;
  readonly rateLimitPerMinute: number;
  search(query: string, options?: ConnectorSearchOptions): Promise<RawMarketplaceListing[]>;
  fetchDetails?(externalId: string): Promise<RawMarketplaceListing | null>;
  healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }>;
}
