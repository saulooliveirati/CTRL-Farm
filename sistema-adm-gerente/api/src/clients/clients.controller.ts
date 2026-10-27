import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentAdmin, JwtAdminAuthGuard } from "../auth/jwt-auth.guard.js";
import type { AuthenticatedAdmin } from "../auth/jwt.strategy.js";
import { ClientsService } from "./clients.service.js";
import { CreateClientDto, UpdateClientDto } from "./dto/create-client.dto.js";

@ApiTags("Clientes")
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: "Lista todos os clientes com paginação e busca" })
  findAll(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.clientsService.findAll({
      search,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtém histórico e detalhes completos do cliente" })
  findOne(@Param("id") id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Cadastra um novo cliente" })
  create(@Body() dto: CreateClientDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.clientsService.create(dto, admin.username);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza informações ou status do cliente" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateClientDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.clientsService.update(id, dto, admin.username);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Altera o status do cliente (ACTIVE, PAUSED, SUSPENDED, CANCELLED)" })
  changeStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.clientsService.changeStatus(id, status, admin.username);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Exclui o cliente e seus registros vinculados" })
  delete(@Param("id") id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.clientsService.delete(id, admin.username);
  }
}
