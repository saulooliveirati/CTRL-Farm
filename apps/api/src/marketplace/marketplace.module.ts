import { Module, Logger, type OnModuleInit, type OnModuleDestroy } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { ConnectorRegistryService } from "./connectors/connector-registry.service.js";
import { MercadoLivreConnector } from "./connectors/mercado-livre.connector.js";
import { ShopeeConnector } from "./connectors/shopee.connector.js";
import { TikTokShopConnector } from "./connectors/tiktok-shop.connector.js";
import { MarketplaceAiService } from "./marketplace-ai.service.js";
import { MarketplaceClassifierService } from "./marketplace-classifier.service.js";
import { MarketplaceController } from "./marketplace.controller.js";
import { MarketplaceIngestionService } from "./marketplace-ingestion.service.js";
import { MarketplaceService } from "./marketplace.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [MarketplaceController],
  providers: [
    MercadoLivreConnector,
    ShopeeConnector,
    TikTokShopConnector,
    ConnectorRegistryService,
    MarketplaceClassifierService,
    MarketplaceIngestionService,
    MarketplaceAiService,
    MarketplaceService,
  ],
  exports: [
    MarketplaceService,
    MarketplaceAiService,
    MarketplaceIngestionService,
    ConnectorRegistryService,
  ],
})
export class MarketplaceModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceModule.name);
  private dailyTimer: NodeJS.Timeout | null = null;

  constructor(private readonly ingestion: MarketplaceIngestionService) {}

  onModuleInit() {
    this.scheduleDailySync();
  }

  onModuleDestroy() {
    if (this.dailyTimer) {
      clearInterval(this.dailyTimer);
      this.dailyTimer = null;
    }
  }

  /**
   * Agendamento de execução diária (a cada 24 horas)
   */
  private scheduleDailySync() {
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    this.dailyTimer = setInterval(() => {
      this.logger.log("Disparando rotina agendada diária do Marketplace Intelligence...");
      this.ingestion
        .runSync({
          triggeredBy: "CRON",
          marketplace: "ALL",
        })
        .catch((err) => {
          this.logger.error(`Falha na rotina agendada do marketplace: ${err}`);
        });
    }, TWENTY_FOUR_HOURS_MS);

    this.logger.log("Agendador diário do Marketplace Intelligence ativado com sucesso.");
  }
}
