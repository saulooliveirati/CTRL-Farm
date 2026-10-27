import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { RecordConsentDto, RequestAnonymizationDto } from "./dto/lgpd.dto.js";
import { LgpdService } from "./lgpd.service.js";

@ApiTags("LGPD & Privacy")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("lgpd")
export class LgpdController {
  constructor(private readonly lgpd: LgpdService) {}

  @Get("status")
  @ApiOperation({ summary: "Obtém status de consentimento e diretrizes LGPD do usuário" })
  getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.lgpd.getStatus(user.companyId, user.id);
  }

  @Post("consent")
  @ApiOperation({ summary: "Registra ou atualiza consentimento de privacidade do usuário" })
  recordConsent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecordConsentDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const ua = req.headers["user-agent"];
    return this.lgpd.recordConsent(user.companyId, user.id, user.name, user.email, dto, ip, ua);
  }

  @Get("export-my-data")
  @ApiOperation({ summary: "Exporta dados pessoais e registros do titular (Portabilidade LGPD)" })
  exportMyData(@CurrentUser() user: AuthenticatedUser) {
    return this.lgpd.exportUserData(user.companyId, user.id);
  }

  @Post("request-anonymization")
  @ApiOperation({ summary: "Solicita anonimização ou exclusão de dados pessoais (Art. 18 LGPD)" })
  requestAnonymization(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RequestAnonymizationDto,
  ) {
    return this.lgpd.requestAnonymization(user.companyId, user.id, dto.reason);
  }
}
