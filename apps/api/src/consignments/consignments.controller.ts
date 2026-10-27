import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { ConsignmentsService } from "./consignments.service.js";
import { CreateLocationDto } from "./dto/create-location.dto.js";
import { UpdateLocationDto } from "./dto/update-location.dto.js";
import { CreateShipmentDto } from "./dto/create-shipment.dto.js";
import { CreateSaleDto } from "./dto/create-sale.dto.js";
import { CreateReturnDto } from "./dto/create-return.dto.js";
import { CreateSettlementDto } from "./dto/create-settlement.dto.js";
import { CreatePaymentDto } from "./dto/create-payment.dto.js";

@ApiTags("Gestão de Consignados")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("consignments")
export class ConsignmentsController {
  constructor(private readonly consignments: ConsignmentsService) {}

  // 1. DASHBOARD & MÉTRICAS
  @Get("dashboard")
  @ApiOperation({ summary: "Retorna resumo de indicadores, rankings e alertas do módulo de consignados" })
  getDashboard(@CurrentUser() user: AuthenticatedUser) {
    return this.consignments.getDashboardMetrics(user.companyId);
  }

  // 2. PARCEIROS
  @Get("locations")
  @ApiOperation({ summary: "Lista os parceiros comerciais de consignação" })
  getLocations(
    @CurrentUser() user: AuthenticatedUser,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("city") city?: string
  ) {
    return this.consignments.getLocations(user.companyId, { search, status, city });
  }

  @Get("locations/:id")
  @ApiOperation({ summary: "Obtém detalhes de um parceiro com seu estoque e histórico" })
  getLocationById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.consignments.getLocationById(user.companyId, id);
  }

  @Post("locations")
  @ApiOperation({ summary: "Cadastra um novo parceiro de consignação" })
  createLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLocationDto
  ) {
    return this.consignments.createLocation(user.companyId, dto);
  }

  @Patch("locations/:id")
  @ApiOperation({ summary: "Atualiza os dados de um parceiro de consignação" })
  updateLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto
  ) {
    return this.consignments.updateLocation(user.companyId, id, dto);
  }

  @Delete("locations/:id")
  @ApiOperation({ summary: "Remove um parceiro (soft delete)" })
  deleteLocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.consignments.deleteLocation(user.companyId, id);
  }

  // 3. ENVIOS (SHIPMENTS)
  @Get("shipments")
  @ApiOperation({ summary: "Lista documentos de envio de produtos para consignação" })
  getShipments(
    @CurrentUser() user: AuthenticatedUser,
    @Query("locationId") locationId?: string
  ) {
    return this.consignments.getShipments(user.companyId, locationId);
  }

  @Get("shipments/:id")
  @ApiOperation({ summary: "Obtém detalhes do lote de envio" })
  getShipmentById(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string
  ) {
    return this.consignments.getShipmentById(user.companyId, id);
  }

  @Post("shipments")
  @ApiOperation({ summary: "Cria e processa envio de produtos consignados" })
  createShipment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateShipmentDto
  ) {
    return this.consignments.createShipment(user.companyId, user.id, dto);
  }

  // 4. ESTOQUES POR PARCEIRO
  @Get("stocks")
  @ApiOperation({ summary: "Lista estoque consolidado por parceiro" })
  getStocks(
    @CurrentUser() user: AuthenticatedUser,
    @Query("locationId") locationId?: string
  ) {
    return this.consignments.getStocks(user.companyId, locationId);
  }

  // 5. VENDAS
  @Get("sales")
  @ApiOperation({ summary: "Lista histórico de vendas consignadas" })
  getSales(
    @CurrentUser() user: AuthenticatedUser,
    @Query("locationId") locationId?: string
  ) {
    return this.consignments.getSales(user.companyId, locationId);
  }

  @Post("sales")
  @ApiOperation({ summary: "Registra venda realizada pelo parceiro" })
  registerSale(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSaleDto
  ) {
    return this.consignments.registerSale(user.companyId, user.id, dto);
  }

  // 6. DEVOLUÇÕES
  @Post("returns")
  @ApiOperation({ summary: "Registra devolução total ou parcial de produtos consignados" })
  registerReturn(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReturnDto
  ) {
    return this.consignments.registerReturn(user.companyId, user.id, dto);
  }

  // 7. ACERTOS & PAGAMENTOS
  @Get("settlements")
  @ApiOperation({ summary: "Lista acertos financeiros (fechamentos)" })
  getSettlements(
    @CurrentUser() user: AuthenticatedUser,
    @Query("locationId") locationId?: string
  ) {
    return this.consignments.getSettlements(user.companyId, locationId);
  }

  @Post("settlements")
  @ApiOperation({ summary: "Gera novo acerto financeiro baseado nas vendas do período" })
  createSettlement(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSettlementDto
  ) {
    return this.consignments.createSettlement(user.companyId, dto);
  }

  @Post("payments")
  @ApiOperation({ summary: "Registra recebimento de pagamento de um acerto" })
  registerPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePaymentDto
  ) {
    return this.consignments.registerPayment(user.companyId, user.id, dto);
  }

  // 8. MOVIMENTAÇÕES
  @Get("movements")
  @ApiOperation({ summary: "Lista histórico completo e imutável de movimentações" })
  getMovements(
    @CurrentUser() user: AuthenticatedUser,
    @Query("locationId") locationId?: string
  ) {
    return this.consignments.getMovements(user.companyId, locationId);
  }

  // 9. RELATÓRIOS
  @Get("reports")
  @ApiOperation({ summary: "Gera dados consolidados para relatórios analíticos" })
  getReports(
    @CurrentUser() user: AuthenticatedUser,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("locationId") locationId?: string,
    @Query("productName") productName?: string,
    @Query("city") city?: string
  ) {
    return this.consignments.getReportData(user.companyId, {
      startDate,
      endDate,
      locationId,
      productName,
      city,
    });
  }
}
