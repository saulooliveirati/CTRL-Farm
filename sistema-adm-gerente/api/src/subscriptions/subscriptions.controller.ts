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
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
} from "./dto/create-subscription.dto.js";
import { SubscriptionsService } from "./subscriptions.service.js";

@ApiTags("Assinaturas")
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: "Lista assinaturas com filtros por cliente e status" })
  findAll(
    @Query("clientId") clientId?: string,
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.subscriptionsService.findAll({
      clientId,
      status,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtém detalhes da assinatura e histórico de pagamentos" })
  findOne(@Param("id") id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: "Cria uma nova assinatura para um cliente" })
  create(
    @Body() dto: CreateSubscriptionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.subscriptionsService.create(dto, admin.username);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza status ou plano da assinatura" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.subscriptionsService.update(id, dto, admin.username);
  }

  @Post(":id/renew")
  @ApiOperation({ summary: "Registra pagamento e renova o período da assinatura" })
  renew(@Param("id") id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.subscriptionsService.renew(id, admin.username);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Altera status da assinatura (ATIVO, PAUSADO, SUSPENSO, CANCELADO)" })
  changeStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @CurrentAdmin() admin: AuthenticatedAdmin,
  ) {
    return this.subscriptionsService.changeStatus(id, status, admin.username);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Exclui a assinatura" })
  delete(@Param("id") id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.subscriptionsService.delete(id, admin.username);
  }

  @Post("process-due")
  @ApiOperation({ summary: "Executa a rotina de validação de pagamentos das assinaturas no vencimento" })
  processDue(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.subscriptionsService.processDueSubscriptions(admin.username);
  }

  @Post(":id/verify-payment")
  @ApiOperation({ summary: "Verifica em tempo real se o pagamento da assinatura foi compensado" })
  verifyPayment(@Param("id") id: string, @CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.subscriptionsService.verifyPayment(id, admin.username);
  }
}
