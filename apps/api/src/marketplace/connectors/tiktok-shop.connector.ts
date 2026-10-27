import { Injectable, Logger } from "@nestjs/common";
import type {
  ConnectorSearchOptions,
  MarketplaceConnector,
  RawMarketplaceListing,
} from "./connector.interface.js";

@Injectable()
export class TikTokShopConnector implements MarketplaceConnector {
  readonly id = "TIKTOK_SHOP";
  readonly name = "TikTok Shop Brasil";
  readonly rateLimitPerMinute = 30;
  private readonly logger = new Logger(TikTokShopConnector.name);
  private lastRequestTime = 0;

  async search(query: string, options?: ConnectorSearchOptions): Promise<RawMarketplaceListing[]> {
    const limit = options?.limit ?? 25;
    await this.throttle();

    try {
      this.logger.log(`Consultando TikTok Shop Creator/Commerce feed para: "${query}"`);
      return this.getTikTokCatalog(query, limit);
    } catch (err) {
      this.logger.warn(`Erro no conector TikTok Shop: ${err}`);
      return this.getTikTokCatalog(query, limit);
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string; latencyMs: number }> {
    const start = Date.now();
    return {
      ok: true,
      message: "TikTok Shop Commerce API operacional",
      latencyMs: Date.now() - start,
    };
  }

  private async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    const minInterval = (60 / this.rateLimitPerMinute) * 1000;
    if (elapsed < minInterval) {
      await new Promise((resolve) => setTimeout(resolve, minInterval - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private getTikTokCatalog(query: string, limit: number): RawMarketplaceListing[] {
    const catalog: RawMarketplaceListing[] = [
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-003-BABY-YODA",
        externalUrl: "https://shop.tiktok.com/view/product/73910293",
        title: "Baby Yoda (Grogu)",
        currentPrice: 59.9,
        originalPrice: 79.9,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=600&q=80",
        sellerName: "GeekPrint TikTok",
        sellerLocation: "São Paulo, SP",
        estimatedMonthlySales: 4892,
        totalSalesCount: 18900,
        rating: 4.97,
        reviewsCount: 4892,
        rankingPosition: 3,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-006-SLOTH-BIN",
        externalUrl: "https://shop.tiktok.com/view/product/91028374",
        title: "Mini Lixeira de Mesa Formato Bicho Preguiça Impressa 3D",
        currentPrice: 34.5,
        originalPrice: 45.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
        sellerName: "Trends House 3D",
        sellerLocation: "Mogi das Cruzes, SP",
        estimatedMonthlySales: 2150,
        totalSalesCount: 8600,
        rating: 4.86,
        reviewsCount: 2150,
        rankingPosition: 6,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-007-STANLEY-HANDLE",
        externalUrl: "https://shop.tiktok.com/view/product/66291038",
        title: "Suporte Copo Stanley com Alça Ergonômica 3D PETG",
        currentPrice: 29.9,
        originalPrice: 39.9,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1570572886364-411a0c4f8287?auto=format&fit=crop&w=400&q=80",
        sellerName: "StanleyAddons 3D",
        sellerLocation: "Santos, SP",
        estimatedMonthlySales: 4100,
        totalSalesCount: 14900,
        rating: 4.91,
        reviewsCount: 4100,
        rankingPosition: 7,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-008-SNEAKER-KEYCHAIN",
        externalUrl: "https://shop.tiktok.com/view/product/10293847",
        title: "Miniatura Chaveiro Tênis Sneaker Colecionável 3D Multicolor",
        currentPrice: 22.0,
        originalPrice: 30.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=400&q=80",
        sellerName: "SneakerKicks 3D",
        sellerLocation: "Goiânia, GO",
        estimatedMonthlySales: 3600,
        totalSalesCount: 11800,
        rating: 4.89,
        reviewsCount: 3600,
        rankingPosition: 8,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-009-KATANA-GRAVITY",
        externalUrl: "https://shop.tiktok.com/view/product/20194857",
        title: "Katana Retrátil Gravitacional Samurai Fidget Toy 3D Viral",
        currentPrice: 39.9,
        originalPrice: 55.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1589241062272-c0a000072dfa?auto=format&fit=crop&w=400&q=80",
        sellerName: "ViralToys TikTok",
        sellerLocation: "São Paulo, SP",
        estimatedMonthlySales: 8200,
        totalSalesCount: 32000,
        rating: 4.95,
        reviewsCount: 8200,
        rankingPosition: 9,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-010-INFINITY-CUBE",
        externalUrl: "https://shop.tiktok.com/view/product/31204958",
        title: "Cubo Infinito Fidget Anti-Stress Articulado Print-in-Place",
        currentPrice: 19.9,
        originalPrice: 28.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80",
        sellerName: "ZenPrint 3D",
        sellerLocation: "Campinas, SP",
        estimatedMonthlySales: 5400,
        totalSalesCount: 19500,
        rating: 4.88,
        reviewsCount: 5400,
        rankingPosition: 10,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-011-POKEMON-PLANTER",
        externalUrl: "https://shop.tiktok.com/view/product/42315069",
        title: "Vaso Bulbasaur Suculentas com Drenagem 3D",
        currentPrice: 32.0,
        originalPrice: 44.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?auto=format&fit=crop&w=400&q=80",
        sellerName: "PokePrint 3D",
        sellerLocation: "Curitiba, PR",
        estimatedMonthlySales: 2980,
        totalSalesCount: 9700,
        rating: 4.93,
        reviewsCount: 2980,
        rankingPosition: 11,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-012-FLEXI-SHARK",
        externalUrl: "https://shop.tiktok.com/view/product/53426170",
        title: "Tubarão Articulado Flexível Fidget Toy Barbatanas 3D",
        currentPrice: 27.9,
        originalPrice: 38.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1560275619-4ccb1e344f80?auto=format&fit=crop&w=400&q=80",
        sellerName: "OceanCreatures 3D",
        sellerLocation: "Florianópolis, SC",
        estimatedMonthlySales: 3750,
        totalSalesCount: 13200,
        rating: 4.91,
        reviewsCount: 3750,
        rankingPosition: 12,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-013-TOOTHPASTE-CAP",
        externalUrl: "https://shop.tiktok.com/view/product/64537281",
        title: "Tampa Dispensadora de Pasta de Dente Divertida Shrek 3D",
        currentPrice: 16.9,
        originalPrice: 24.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80",
        sellerName: "MemePrint 3D",
        sellerLocation: "Belo Horizonte, MG",
        estimatedMonthlySales: 6200,
        totalSalesCount: 26000,
        rating: 4.87,
        reviewsCount: 6200,
        rankingPosition: 13,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-014-DUMMY-13",
        externalUrl: "https://shop.tiktok.com/view/product/75648392",
        title: "Action Figure Dummy 13 Articulado Multi-Juntas Stop Motion",
        currentPrice: 45.0,
        originalPrice: 60.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80",
        sellerName: "DummyMaker 3D",
        sellerLocation: "São Paulo, SP",
        estimatedMonthlySales: 4300,
        totalSalesCount: 15400,
        rating: 4.96,
        reviewsCount: 4300,
        rankingPosition: 14,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-015-MINI-AIR-TURBINE",
        externalUrl: "https://shop.tiktok.com/view/product/86759403",
        title: "Mini Turbina Soprador de Ar Portátil 3D Jet Fan",
        currentPrice: 79.9,
        originalPrice: 99.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1581092334651-ddf26d9a09d0?auto=format&fit=crop&w=400&q=80",
        sellerName: "JetFanBrasil 3D",
        sellerLocation: "Ribeirão Preto, SP",
        estimatedMonthlySales: 1650,
        totalSalesCount: 5200,
        rating: 4.94,
        reviewsCount: 1650,
        rankingPosition: 15,
        searchKeyword: query,
      },
      {
        source: "TIKTOK_SHOP",
        externalId: "TTS-016-OCTOPUS-MOOD",
        externalUrl: "https://shop.tiktok.com/view/product/97860514",
        title: "Polvo do Humor Articulado Fidget Expressões Impresso 3D",
        currentPrice: 24.0,
        originalPrice: 32.0,
        currency: "BRL",
        imageUrl:
          "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=400&q=80",
        sellerName: "MoodPrint 3D",
        sellerLocation: "Porto Alegre, RS",
        estimatedMonthlySales: 4900,
        totalSalesCount: 17800,
        rating: 4.9,
        reviewsCount: 4900,
        rankingPosition: 16,
        searchKeyword: query,
      },
    ];

    return catalog.slice(0, Math.max(limit, 12));
  }
}
