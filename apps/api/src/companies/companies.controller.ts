import { Body, Controller, ForbiddenException, Get, Patch, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CompaniesService, type PermissionMatrixRow } from "./companies.service.js";
import { UpdateCompanyDto } from "./dto/update-company.dto.js";

@ApiTags("Companies")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("companies")
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @ApiOperation({ summary: "Lista dados da empresa do usuário autenticado" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.findAll(user.companyId);
  }

  @Get("me")
  @ApiOperation({ summary: "Retorna todos os detalhes cadastrais da empresa" })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.getMe(user.companyId);
  }

  @Patch("me")
  @ApiOperation({ summary: "Atualiza informações cadastrais da empresa (Exclusivo Administrador)" })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCompanyDto) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException(
        "Apenas usuários com nível Administrador podem alterar as informações da empresa.",
      );
    }
    return this.companiesService.updateMe(user.companyId, dto);
  }

  @Get("me/permissions")
  @ApiOperation({ summary: "Retorna a matriz de permissões dos níveis de acesso da empresa" })
  getPermissions(@CurrentUser() user: AuthenticatedUser) {
    return this.companiesService.getPermissions(user.companyId);
  }

  @Put("me/permissions")
  @ApiOperation({
    summary: "Atualiza a matriz de permissões dos níveis de acesso (Exclusivo Administrador)",
  })
  updatePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { permissions: PermissionMatrixRow[] },
  ) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException(
        "Apenas usuários com nível Administrador podem editar a matriz de permissões da empresa.",
      );
    }
    return this.companiesService.updatePermissions(user.companyId, body.permissions);
  }
}
