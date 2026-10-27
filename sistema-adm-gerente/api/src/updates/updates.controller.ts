import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAdmin, JwtAdminAuthGuard } from "../auth/jwt-auth.guard.js";
import type { AuthenticatedAdmin } from "../auth/jwt.strategy.js";
import { CreateReleaseDto } from "./dto/create-release.dto.js";
import { UpdatesService } from "./updates.service.js";

@ApiTags("Gerenciamento de Atualizações")
@Controller("updates")
export class UpdatesController {
  constructor(private readonly updatesService: UpdatesService) {}

  @Get()
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lista todas as versões e atualizações lançadas" })
  findAll() {
    return this.updatesService.findAll();
  }

  @Post()
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Publica uma nova versão do CTRL-Farm com changelog" })
  create(@Body() dto: CreateReleaseDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.updatesService.create(dto, admin.username);
  }

  @Get("check")
  @ApiOperation({ summary: "Endpoint M2M para o CTRL-Farm verificar atualizações disponíveis" })
  checkUpdate(@Query("version") clientVersion?: string) {
    return this.updatesService.checkUpdate(clientVersion);
  }

  @Get(":id")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtém detalhes de uma release por ID" })
  findOne(@Param("id") id: string) {
    return this.updatesService.findOne(id);
  }
}
