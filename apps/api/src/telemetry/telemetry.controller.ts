import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { ConfigureTelemetryDto, TestTelemetryDto } from "./dto/configure-telemetry.dto.js";
import { ControlPrinterDto } from "./dto/control-printer.dto.js";
import { TelemetryService } from "./telemetry.service.js";

@ApiTags("Telemetria de Impressoras")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("telemetry")
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  @Post("printers/:id/configure")
  @ApiOperation({
    summary:
      "Configura IP e protocolo de telemetria da impressora (Klipper / Moonraker / OctoPrint)",
  })
  configure(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ConfigureTelemetryDto,
  ) {
    return this.telemetryService.configure(user.companyId, id, dto);
  }

  @Post("printers/:id/test")
  @ApiOperation({
    summary: "Valida e testa a conexão em tempo real sem alterar permanentemente a configuração",
  })
  test(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TestTelemetryDto,
  ) {
    return this.telemetryService.testConnection(user.companyId, id, dto);
  }

  @Post("printers/:id/control")
  @ApiOperation({
    summary:
      "Envia comando de controle (temperatura, home, movimentação, pausa/cancela) para a impressora",
  })
  control(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ControlPrinterDto,
  ) {
    return this.telemetryService.control(user.companyId, id, dto);
  }

  @Post("printers/:id/sync")
  @ApiOperation({
    summary: "Lê telemetria ao vivo da impressora (temperaturas, status e progresso)",
  })
  sync(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.telemetryService.sync(user.companyId, id);
  }

  @Post("printers/:id/ping")
  @ApiOperation({
    summary: "Verifica resposta a ping/porta da impressora e atualiza status para online/desligada",
  })
  ping(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.telemetryService.pingPrinter(user.companyId, id);
  }

  @Post("poll-all")
  @ApiOperation({
    summary: "Dispara verificação de ping e telemetria para todos os equipamentos cadastrados",
  })
  pollAll(@CurrentUser() _user: AuthenticatedUser) {
    return this.telemetryService.pollAllPrinters();
  }

  @Delete("printers/:id")
  @ApiOperation({ summary: "Desconecta e remove a configuração de telemetria da impressora" })
  disconnect(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.telemetryService.disconnect(user.companyId, id);
  }
}
