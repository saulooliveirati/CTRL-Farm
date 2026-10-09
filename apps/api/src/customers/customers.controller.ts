import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreateCustomerDto } from "./dto/create-customer.dto.js";
import { UpdateCustomerDto } from "./dto/update-customer.dto.js";
import { CustomersService } from "./customers.service.js";

@ApiTags("Customers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: "Lista clientes da empresa autenticada" })
  findAll(@CurrentUser() user: AuthenticatedUser) { return this.customersService.findAll(user.companyId); }

  @Post()
  @ApiOperation({ summary: "Cadastra um cliente" })
  @ApiCreatedResponse({ description: "Cliente cadastrado." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCustomerDto) { return this.customersService.create(user.companyId, dto); }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza um cliente" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto) { return this.customersService.update(user.companyId, id, dto); }

  @Delete(":id")
  @ApiOperation({ summary: "Remove cliente sem pedidos vinculados" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) { return this.customersService.remove(user.companyId, id); }
}
