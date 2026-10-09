import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreateSupplierDto } from "./dto/create-supplier.dto.js";
import { UpdateSupplierDto } from "./dto/update-supplier.dto.js";
import { SuppliersService } from "./suppliers.service.js";

@ApiTags("Suppliers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({ summary: "Lista fornecedores da empresa" })
  findAll(@CurrentUser() user: AuthenticatedUser) { return this.suppliersService.findAll(user.companyId); }

  @Post()
  @ApiOperation({ summary: "Cadastra fornecedor" })
  @ApiCreatedResponse({ description: "Fornecedor cadastrado." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupplierDto) { return this.suppliersService.create(user.companyId, dto); }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza fornecedor" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateSupplierDto) { return this.suppliersService.update(user.companyId, id, dto); }

  @Delete(":id")
  @ApiOperation({ summary: "Remove fornecedor sem materiais vinculados" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) { return this.suppliersService.remove(user.companyId, id); }
}
