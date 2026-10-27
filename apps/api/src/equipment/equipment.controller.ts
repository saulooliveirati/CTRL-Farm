import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreateEquipmentDto, UpdateEquipmentDto } from "./dto/equipment.dto.js";
import { EquipmentService } from "./equipment.service.js";

function ensureCanManage(user: AuthenticatedUser) {
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    throw new ForbiddenException(
      "Apenas Administradores e Moderadores possuem permissão para cadastrar ou excluir equipamentos.",
    );
  }
}

@ApiTags("Workshop Equipment")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("equipment")
export class EquipmentController {
  constructor(private readonly equipment: EquipmentService) {}

  @Get()
  @ApiOperation({ summary: "Lista equipamentos da empresa por aba ou geral" })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("tabKey") tabKey?: string) {
    return this.equipment.findAll(user.companyId, tabKey);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtém detalhes de um equipamento" })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.equipment.findOne(user.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: "Cadastra novo equipamento na oficina" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEquipmentDto) {
    ensureCanManage(user);
    return this.equipment.create(user.companyId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza informações do equipamento" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateEquipmentDto,
  ) {
    // Operadores podem atualizar status ou notas de manutenção
    return this.equipment.update(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Exclui um equipamento" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    ensureCanManage(user);
    return this.equipment.remove(user.companyId, id);
  }
}
