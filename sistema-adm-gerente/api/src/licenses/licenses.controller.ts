import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentAdmin, JwtAdminAuthGuard } from "../auth/jwt-auth.guard.js";
import type { AuthenticatedAdmin } from "../auth/jwt.strategy.js";
import {
  ActivateLicenseDto,
  GenerateLicenseDto,
  RevokeLicenseDto,
  ValidateLicenseDto,
} from "./dto/generate-license.dto.js";
import { LicensesService } from "./licenses.service.js";

@ApiTags("Licenças & Chaves Criptografadas")
@Controller("licenses")
export class LicensesController {
  constructor(private readonly licensesService: LicensesService) {}

  // ================= ROTAS ADMINISTRATIVAS =================

  @Post()
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Gera e assina digitalmente com RSA uma nova licença CTRL-FARM-XXXX-XXXX-XXXX" })
  generateRoot(@Body() dto: GenerateLicenseDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.licensesService.generate(dto, admin.username);
  }

  @Post("generate")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Gera e assina digitalmente com RSA uma nova licença CTRL-FARM-XXXX-XXXX-XXXX" })
  generate(@Body() dto: GenerateLicenseDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.licensesService.generate(dto, admin.username);
  }

  @Get()
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lista todas as licenças emitidas com status e cliente" })
  findAll(
    @Query("clientId") clientId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.licensesService.findAll({
      clientId,
      status,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get("public-key")
  @ApiOperation({ summary: "Obtém a chave pública RSA 4096-bit do Sistema ADM Gerente para verificação local" })
  getPublicKey() {
    return this.licensesService.getPublicKey();
  }

  @Get(":id")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtém detalhes completos da licença e logs de validação" })
  findOne(@Param("id") id: string) {
    return this.licensesService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Edita validade ou recursos da licença com re-assinatura RSA automática" })
  update(
    @Param("id") id: string,
    @Body() dto: { expiresAt?: string; offlineGracePeriodDays?: number; features?: any },
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.licensesService.update(id, dto, admin.username);
  }

  @Patch(":id/status")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Altera status da licença (ACTIVE, PAUSED, SUSPENDED, REVOKED)" })
  changeStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.licensesService.changeStatus(id, status, admin.username);
  }

  @Delete(":id")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Exclui a licença e seus logs de validação" })
  delete(@Param("id") id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.licensesService.delete(id, admin.username);
  }

  @Post(":id/revoke")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoga uma licença ativa" })
  revoke(
    @Param("id") id: string,
    @Body() dto: RevokeLicenseDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.licensesService.revoke(id, dto, admin.username);
  }

  // ================= ROTAS M2M PARA O CTRL-FARM =================

  @Post("activate")
  @ApiOperation({ summary: "Ativação de chave de licença realizada pelo CTRL-Farm" })
  activate(@Body() dto: ActivateLicenseDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    return this.licensesService.activate(dto, ip);
  }

  @Post("validate")
  @ApiOperation({ summary: "Validação online periódica de licença consultada pelo CTRL-Farm" })
  validate(@Body() dto: ValidateLicenseDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    return this.licensesService.validateOnline(dto, ip);
  }

  @Get("check-status/:activationKey")
  @ApiOperation({ summary: "Consulta o status da assinatura e se há suspensão por pagamento pendente" })
  checkStatus(@Param("activationKey") activationKey: string) {
    return this.licensesService.checkSubscriptionStatus(activationKey);
  }
}
