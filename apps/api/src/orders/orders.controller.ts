import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreateOrderDto } from "./dto/create-order.dto.js";
import { OrdersService } from "./orders.service.js";

@ApiTags("Orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: "Lista pedidos e seu vínculo com a produção" })
  findAll(@CurrentUser() user: AuthenticatedUser) { return this.ordersService.findAll(user.companyId); }

  @Post()
  @ApiOperation({ summary: "Cadastra um pedido de cliente" })
  @ApiCreatedResponse({ description: "Pedido cadastrado." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) { return this.ordersService.create(user.companyId, dto); }

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancela um pedido ainda sem produção vinculada" })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) { return this.ordersService.cancel(user.companyId, id); }

  @Delete(":id")
  @ApiOperation({ summary: "Remove pedido sem produção vinculada" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) { return this.ordersService.remove(user.companyId, id); }
}
