import { Injectable, Logger } from "@nestjs/common";
import type { MarketplaceConnector, MarketplaceSource } from "./connector.interface.js";
import { MercadoLivreConnector } from "./mercado-livre.connector.js";
import { ShopeeConnector } from "./shopee.connector.js";
import { TikTokShopConnector } from "./tiktok-shop.connector.js";

@Injectable()
export class ConnectorRegistryService {
  private readonly logger = new Logger(ConnectorRegistryService.name);
  private readonly connectors = new Map<MarketplaceSource, MarketplaceConnector>();

  constructor(
    private readonly meliConnector: MercadoLivreConnector,
    private readonly shopeeConnector: ShopeeConnector,
    private readonly tikTokConnector: TikTokShopConnector,
  ) {
    this.register(this.meliConnector);
    this.register(this.shopeeConnector);
    this.register(this.tikTokConnector);
    this.logger.log(
      `Conectores de Marketplace inicializados: ${Array.from(this.connectors.keys()).join(", ")}`,
    );
  }

  register(connector: MarketplaceConnector) {
    this.connectors.set(connector.id, connector);
    this.logger.log(`Conector registrado: ${connector.name} (${connector.id})`);
  }

  getConnector(source: MarketplaceSource): MarketplaceConnector | undefined {
    return this.connectors.get(source);
  }

  getAllConnectors(): MarketplaceConnector[] {
    return Array.from(this.connectors.values());
  }

  getSupportedSources(): MarketplaceSource[] {
    return Array.from(this.connectors.keys());
  }

  async healthCheckAll() {
    const results = await Promise.all(
      this.getAllConnectors().map(async (c) => ({
        source: c.id,
        name: c.name,
        health: await c.healthCheck(),
      })),
    );
    return results;
  }
}
