import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import {
  NaturalLanguageQueryDto,
  QueryMarketplaceProductsDto,
  SimulateProfitDto,
  TriggerSyncDto,
} from "./dto/marketplace.dto.js";
import { MarketplaceAiService } from "./marketplace-ai.service.js";
import { MarketplaceIngestionService } from "./marketplace-ingestion.service.js";
import { MarketplaceService } from "./marketplace.service.js";

@ApiTags("Marketplace Intelligence")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("marketplace")
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly ingestionService: MarketplaceIngestionService,
    private readonly aiService: MarketplaceAiService,
  ) {}

  @Get("metrics")
  @ApiOperation({ summary: "Obtém indicadores consolidados do Marketplace Intelligence" })
  getMetrics() {
    return this.marketplaceService.getMetrics();
  }

  @Get("products")
  @ApiOperation({ summary: "Lista produtos 3D monitorados com filtros avançados" })
  findAll(@Query() query: QueryMarketplaceProductsDto) {
    return this.marketplaceService.findAll(query);
  }

  @Get("products/:id")
  @ApiOperation({ summary: "Obtém detalhes do produto 3D com histórico de até 90 dias" })
  findOne(@Param("id") id: string) {
    return this.marketplaceService.findOne(id);
  }

  @Post("query")
  @ApiOperation({ summary: "Consulta o Marketplace Intelligence via Linguagem Natural com IA" })
  naturalLanguageQuery(@Body() dto: NaturalLanguageQueryDto) {
    return this.aiService.processQuery(dto.query, dto.targetPrinter);
  }

  @Post("sync")
  @ApiOperation({ summary: "Dispara ingestão e sincronização diária dos marketplaces" })
  triggerSync(@CurrentUser() user: AuthenticatedUser, @Body() dto: TriggerSyncDto) {
    return this.ingestionService.runSync({
      companyId: user.companyId,
      marketplace: dto.marketplace || "ALL",
      keywords: dto.keywords,
      triggeredBy: "MANUAL",
    });
  }

  @Get("sync-logs")
  @ApiOperation({ summary: "Lista histórico de execuções de sincronização" })
  getSyncLogs() {
    return this.marketplaceService.getSyncLogs();
  }

  @Post("simulate-profit")
  @ApiOperation({ summary: "Simula lucro líquido e tempo de fabricação na fazenda" })
  simulateProfit(@Body() dto: SimulateProfitDto) {
    return this.marketplaceService.simulateProfit(dto);
  }
}
