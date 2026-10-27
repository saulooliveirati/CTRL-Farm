import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAdminAuthGuard } from "../auth/jwt-auth.guard.js";
import { PaymentsService } from "./payments.service.js";

@ApiTags("Pagamentos & Webhooks de Gateways")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("webhook/:provider")
  @ApiOperation({ summary: "Endpoint receptor de webhooks públicos (Mercado Pago, PagSeguro, InfinitePay, Asaas)" })
  handleWebhook(
    @Param("provider") provider: string,
    @Body() body: any,
    @Headers() headers: Record<string, any>,
  ) {
    return this.paymentsService.handleWebhook(provider, body, headers);
  }

  @Get("transactions")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lista histórico de transações e pagamentos processados via gateway" })
  getTransactions(
    @Query("provider") provider?: string,
    @Query("status") status?: string,
    @Query("limit") limit?: string,
  ) {
    return this.paymentsService.getTransactions({
      provider,
      status,
      limit: limit ? Number(limit) : 50,
    });
  }
}
