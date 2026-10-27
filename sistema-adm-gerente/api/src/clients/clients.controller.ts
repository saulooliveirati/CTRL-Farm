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
import {
  CreateClientDto,
  UpdateClientDto,
  PendingRegistrationDto,
  ApproveRegistrationDto,
} from "./dto/create-client.dto.js";

@ApiTags("Clientes")
@Controller("clients")
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post("pending-registration")
  @ApiOperation({ summary: "Recebe solicitação de novo cadastro vindo do sistema CTRL-Farm" })
  pendingRegistration(@Body() dto: PendingRegistrationDto) {
    return this.clientsService.handlePendingRegistration(dto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
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
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @ApiOperation({ summary: "Obtém histórico e detalhes completos do cliente" })
  findOne(@Param("id") id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @ApiOperation({ summary: "Cadastra um novo cliente manualmente" })
  create(@Body() dto: CreateClientDto, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.clientsService.create(dto, admin?.username);
  }

  @Post(":id/approve-registration")
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @ApiOperation({ summary: "Aprova cadastro pendente, gera chave RSA e envia confirmação por e-mail" })
  approveRegistration(
    @Param("id") id: string,
    @Body() dto: ApproveRegistrationDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.clientsService.approveRegistration(id, dto, admin?.username);
  }

  @Patch(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @ApiOperation({ summary: "Atualiza informações ou status do cliente" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateClientDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.clientsService.update(id, dto, admin?.username);
  }

  @Patch(":id/status")
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @ApiOperation({ summary: "Altera o status do cliente (ACTIVE, PENDING, PAUSED, SUSPENDED, CANCELLED)" })
  changeStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.clientsService.changeStatus(id, status, admin?.username);
  }

  @Delete(":id")
  @ApiBearerAuth()
  @UseGuards(JwtAdminAuthGuard)
  @ApiOperation({ summary: "Exclui o cliente e seus registros vinculados" })
  delete(@Param("id") id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.clientsService.delete(id, admin?.username);
  }
}
