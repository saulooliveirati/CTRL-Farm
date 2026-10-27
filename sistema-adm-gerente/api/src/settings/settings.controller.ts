import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAdmin, JwtAdminAuthGuard } from "../auth/jwt-auth.guard.js";
import type { AuthenticatedAdmin } from "../auth/jwt.strategy.js";
import { SettingsService, UpdateGatewayDto, UpdateSystemSettingsDto } from "./settings.service.js";

@ApiTags("Configurações do Sistema & Gateways")
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Obtém as configurações gerais do Sistema ADM Gerente" })
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @ApiOperation({ summary: "Atualiza as configurações gerais do Sistema ADM Gerente" })
  updateSettings(
    @Body() dto: UpdateSystemSettingsDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.settingsService.updateSettings(dto, admin.username);
  }

  @Get("gateways")
  @ApiOperation({ summary: "Lista todas as configurações de gateways de pagamento (Mercado Pago, PagSeguro, InfinitePay, Asaas)" })
  getGateways() {
    return this.settingsService.getGateways();
  }

  @Put("gateways/:provider")
  @ApiOperation({ summary: "Atualiza credenciais e métodos de um gateway específico" })
  updateGateway(
    @Param("provider") provider: string,
    @Body() dto: UpdateGatewayDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.settingsService.updateGateway(provider, dto, admin.username);
  }

  @Post("gateways/:provider/test")
  @ApiOperation({ summary: "Testa a conexão e valida credenciais com a API oficial do gateway" })
  testGateway(
    @Param("provider") provider: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.settingsService.testGatewayConnection(provider, admin.username);
  }
}
