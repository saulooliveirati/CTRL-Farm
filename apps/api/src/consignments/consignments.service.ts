import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { CreateLocationDto } from "./dto/create-location.dto.js";
import { UpdateLocationDto } from "./dto/update-location.dto.js";
import { CreateShipmentDto } from "./dto/create-shipment.dto.js";
import { CreateSaleDto } from "./dto/create-sale.dto.js";
import { CreateReturnDto } from "./dto/create-return.dto.js";
import { CreateSettlementDto } from "./dto/create-settlement.dto.js";
import { CreatePaymentDto, ConsignmentPaymentMethod } from "./dto/create-payment.dto.js";

@Injectable()
export class ConsignmentsService {
  private readonly logger = new Logger(ConsignmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. DASHBOARD & MÉTRICAS CONSOLIDADAS
  // ==========================================

  async getDashboardMetrics(companyId: string) {
    const now = new Date();

    // 1. Parceiros
    const [totalPartners, activePartners] = await Promise.all([
      this.prisma.consignmentLocation.count({
        where: { companyId, deletedAt: null },
      }),
      this.prisma.consignmentLocation.count({
        where: { companyId, status: "ACTIVE", deletedAt: null },
      }),
    ]);

    // 2. Estoques Consolidados
    const stocks = await this.prisma.consignmentStock.findMany({
      where: { companyId, deletedAt: null },
    });

    let productsInConsignment = 0;
    let totalCostInConsignment = 0;
    let totalValueInConsignment = 0;
    let productsSold = 0;
    let productsReturned = 0;
    let productsDamaged = 0;

    for (const s of stocks) {
      productsInConsignment += s.quantityAvailable;
      totalCostInConsignment += s.quantityAvailable * Number(s.costPrice);
      totalValueInConsignment += s.quantityAvailable * Number(s.sellingPrice);
      productsSold += s.quantitySold;
      productsReturned += s.quantityReturned;
      productsDamaged += s.quantityDamaged;
    }

    // 3. Vendas & Financeiro
    const sales = await this.prisma.consignmentSale.findMany({
      where: { companyId, deletedAt: null },
      include: { location: { select: { id: true, name: true } } },
    });

    let totalGrossSales = 0;
    let totalCommissions = 0;
    let totalFarmRevenue = 0;
    let totalNetProfit = 0;

    const partnerSalesMap: Record<string, { id: string; name: string; totalRevenue: number; itemsSold: number }> = {};
    const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};

    for (const sale of sales) {
      totalGrossSales += Number(sale.grossAmount);
      totalCommissions += Number(sale.partnerCommission);
      totalFarmRevenue += Number(sale.farmRevenue);
      totalNetProfit += Number(sale.netProfit);

      // Ranking Parceiros
      if (!partnerSalesMap[sale.locationId]) {
        partnerSalesMap[sale.locationId] = {
          id: sale.locationId,
          name: sale.location.name,
          totalRevenue: 0,
          itemsSold: 0,
        };
      }
      partnerSalesMap[sale.locationId]!.totalRevenue += Number(sale.grossAmount);
      partnerSalesMap[sale.locationId]!.itemsSold += sale.quantity;

      // Ranking Produtos
      if (!productSalesMap[sale.productName]) {
        productSalesMap[sale.productName] = {
          name: sale.productName,
          quantity: 0,
          revenue: 0,
        };
      }
      productSalesMap[sale.productName]!.quantity += sale.quantity;
      productSalesMap[sale.productName]!.revenue += Number(sale.grossAmount);
    }

    // 4. Acertos Financeiros & Contas a Receber
    const settlements = await this.prisma.consignmentSettlement.findMany({
      where: { companyId, deletedAt: null },
    });

    let totalToReceive = 0;
    let totalReceived = 0;
    let overdueSettlementsCount = 0;

    for (const st of settlements) {
      totalReceived += Number(st.totalPaid);
      if (st.status === "PENDING" || st.status === "OVERDUE") {
        totalToReceive += Number(st.balanceDue);
      }
      if (st.status === "OVERDUE" || (st.dueDate < now && Number(st.balanceDue) > 0)) {
        overdueSettlementsCount++;
      }
    }

    // Se houver vendas ainda não faturadas em acertos, soma ao saldo a receber
    const unbilledSales = sales.filter((s) => !s.settlementId);
    const unbilledAmount = unbilledSales.reduce((acc, s) => acc + Number(s.farmRevenue), 0);
    totalToReceive += unbilledAmount;

    // 5. Rankings
    const topPartners = Object.values(partnerSalesMap)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 6. Alertas Inteligentes
    const alerts: Array<{
      type: "LOW_STOCK" | "STAGNANT" | "OVERDUE" | "HIGH_RETURN";
      severity: "WARNING" | "CRITICAL" | "INFO";
      title: string;
      description: string;
      locationId?: string;
    }> = [];

    // Alerta: Estoque baixo (<= 2 unidades em estoque)
    const lowStocks = stocks.filter((s) => s.quantityAvailable > 0 && s.quantityAvailable <= 2);
    for (const ls of lowStocks.slice(0, 5)) {
      alerts.push({
        type: "LOW_STOCK",
        severity: "WARNING",
        title: `Estoque Baixo: ${ls.productName}`,
        description: `Apenas ${ls.quantityAvailable} unidade(s) restante(s).`,
        locationId: ls.locationId,
      });
    }

    // Alerta: Acertos vencidos
    if (overdueSettlementsCount > 0) {
      alerts.push({
        type: "OVERDUE",
        severity: "CRITICAL",
        title: `${overdueSettlementsCount} Acerto(s) Vencido(s)`,
        description: "Existem repasses de vendas com prazo de pagamento expirado.",
      });
    }

    // Alerta: Produtos com devolução excessiva (> 20% de taxa de devolução)
    for (const s of stocks) {
      const totalMoved = s.quantitySold + s.quantityReturned;
      if (totalMoved >= 5 && s.quantityReturned / totalMoved > 0.2) {
        alerts.push({
          type: "HIGH_RETURN",
          severity: "WARNING",
          title: `Alta Taxa de Devolução: ${s.productName}`,
          description: `${s.quantityReturned} unidades devolvidas de ${totalMoved} movimentadas.`,
          locationId: s.locationId,
        });
      }
    }

    return {
      overview: {
        totalPartners,
        activePartners,
        productsInConsignment,
        totalCostInConsignment,
        totalValueInConsignment,
        productsSold,
        productsReturned,
        productsDamaged,
        totalGrossSales,
        totalCommissions,
        totalFarmRevenue,
        totalToReceive,
        totalReceived,
        totalNetProfit,
        profitMargin: totalGrossSales > 0 ? (totalNetProfit / totalGrossSales) * 100 : 0,
      },
      topPartners,
      topProducts,
      alerts,
    };
  }

  // ==========================================
  // 2. PARCEIROS (CONSIGNMENT LOCATION)
  // ==========================================

  async getLocations(companyId: string, query?: { search?: string; status?: string; city?: string }) {
    const where: Prisma.ConsignmentLocationWhereInput = {
      companyId,
      deletedAt: null,
      ...(query?.status && { status: query.status }),
      ...(query?.city && { city: { contains: query.city, mode: "insensitive" } }),
      ...(query?.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { corporateName: { contains: query.search, mode: "insensitive" } },
          { tradeName: { contains: query.search, mode: "insensitive" } },
          { contactPerson: { contains: query.search, mode: "insensitive" } },
          { city: { contains: query.search, mode: "insensitive" } },
          { document: { contains: query.search, mode: "insensitive" } },
        ],
      }),
    };

    const locations = await this.prisma.consignmentLocation.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            consignments: true,
            sales: true,
            stocks: true,
            settlements: true,
          },
        },
      },
    });

    return locations;
  }

  async getLocationById(companyId: string, id: string) {
    const location = await this.prisma.consignmentLocation.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        stocks: {
          where: { deletedAt: null },
          orderBy: { quantityAvailable: "desc" },
        },
        consignments: {
          where: { deletedAt: null },
          orderBy: { date: "desc" },
          take: 10,
          include: { items: true },
        },
        sales: {
          where: { deletedAt: null },
          orderBy: { saleDate: "desc" },
          take: 15,
        },
        settlements: {
          where: { deletedAt: null },
          orderBy: { periodEnd: "desc" },
          take: 10,
        },
      },
    });

    if (!location) {
      throw new NotFoundException("Parceiro de consignação não encontrado.");
    }

    return location;
  }

  async createLocation(companyId: string, dto: CreateLocationDto) {
    const existing = await this.prisma.consignmentLocation.findFirst({
      where: { companyId, name: dto.name.trim(), deletedAt: null },
    });

    if (existing) {
      throw new ConflictException("Já existe um parceiro cadastrado com este nome nesta empresa.");
    }

    return this.prisma.consignmentLocation.create({
      data: {
        companyId,
        name: dto.name.trim(),
        corporateName: dto.corporateName?.trim() || null,
        tradeName: dto.tradeName?.trim() || null,
        contactPerson: dto.contactPerson?.trim() || null,
        phone: dto.phone?.trim() || null,
        whatsapp: dto.whatsapp?.trim() || null,
        email: dto.email?.trim().toLowerCase() || null,
        document: dto.document?.trim() || null,
        zipCode: dto.zipCode?.trim() || null,
        address: dto.address?.trim() || null,
        city: dto.city?.trim() || null,
        state: dto.state?.trim().toUpperCase() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        instagram: dto.instagram?.trim() || null,
        facebook: dto.facebook?.trim() || null,
        googleMapsUrl: dto.googleMapsUrl?.trim() || null,
        logoUrl: dto.logoUrl?.trim() || null,
        photos: dto.photos || [],
        notes: dto.notes?.trim() || null,
        status: dto.status || "ACTIVE",
        defaultCommissionRate: dto.defaultCommissionRate ?? 20.0,
        defaultCommissionType: dto.defaultCommissionType || "PERCENTAGE",
        defaultCommissionValue: dto.defaultCommissionValue ?? 0,
      },
    });
  }

  async updateLocation(companyId: string, id: string, dto: UpdateLocationDto) {
    await this.getLocationById(companyId, id);

    return this.prisma.consignmentLocation.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.corporateName !== undefined && { corporateName: dto.corporateName?.trim() || null }),
        ...(dto.tradeName !== undefined && { tradeName: dto.tradeName?.trim() || null }),
        ...(dto.contactPerson !== undefined && { contactPerson: dto.contactPerson?.trim() || null }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(dto.whatsapp !== undefined && { whatsapp: dto.whatsapp?.trim() || null }),
        ...(dto.email !== undefined && { email: dto.email?.trim().toLowerCase() || null }),
        ...(dto.document !== undefined && { document: dto.document?.trim() || null }),
        ...(dto.zipCode !== undefined && { zipCode: dto.zipCode?.trim() || null }),
        ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
        ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
        ...(dto.state !== undefined && { state: dto.state?.trim().toUpperCase() || null }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.instagram !== undefined && { instagram: dto.instagram?.trim() || null }),
        ...(dto.facebook !== undefined && { facebook: dto.facebook?.trim() || null }),
        ...(dto.googleMapsUrl !== undefined && { googleMapsUrl: dto.googleMapsUrl?.trim() || null }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl?.trim() || null }),
        ...(dto.photos !== undefined && { photos: dto.photos }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.defaultCommissionRate !== undefined && { defaultCommissionRate: dto.defaultCommissionRate }),
        ...(dto.defaultCommissionType !== undefined && { defaultCommissionType: dto.defaultCommissionType }),
        ...(dto.defaultCommissionValue !== undefined && { defaultCommissionValue: dto.defaultCommissionValue }),
      },
    });
  }

  async deleteLocation(companyId: string, id: string) {
    const loc = await this.getLocationById(companyId, id);

    // Valida se o parceiro possui estoque ativo não devolvido
    const activeStock = await this.prisma.consignmentStock.findFirst({
      where: { locationId: id, quantityAvailable: { gt: 0 }, deletedAt: null },
    });

    if (activeStock) {
      throw new BadRequestException(
        "Não é possível remover o parceiro pois ele ainda possui produtos em estoque consignado. Realize a devolução dos itens primeiro."
      );
    }

    // Soft delete
    return this.prisma.consignmentLocation.update({
      where: { id },
      data: { deletedAt: new Date(), status: "INACTIVE" },
    });
  }

  // ==========================================
  // 3. ENVIO DE PRODUTOS (CONSIGNMENT)
  // ==========================================

  async getShipments(companyId: string, locationId?: string) {
    return this.prisma.consignment.findMany({
      where: {
        companyId,
        ...(locationId && { locationId }),
        deletedAt: null,
      },
      orderBy: { date: "desc" },
      include: {
        location: { select: { id: true, name: true, city: true } },
        items: true,
      },
    });
  }

  async getShipmentById(companyId: string, id: string) {
    const shipment = await this.prisma.consignment.findFirst({
      where: { id, companyId, deletedAt: null },
      include: {
        location: true,
        items: true,
        movements: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!shipment) {
      throw new NotFoundException("Documento de envio não encontrado.");
    }

    return shipment;
  }

  async createShipment(companyId: string, userId: string, dto: CreateShipmentDto) {
    const location = await this.getLocationById(companyId, dto.locationId);

    if (location.status === "BLOCKED") {
      throw new BadRequestException("Este parceiro encontra-se bloqueado para novos envios.");
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("O documento de envio deve conter pelo menos 1 produto.");
    }

    // Gera número sequencial de envio: ENV-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const countThisYear = await this.prisma.consignment.count({
      where: {
        companyId,
        date: {
          gte: new Date(`${currentYear}-01-01T00:00:00Z`),
        },
      },
    });

    const shipmentNumber =
      dto.shipmentNumber?.trim() ||
      `ENV-${currentYear}-${String(countThisYear + 1).padStart(4, "0")}`;

    // Executa em Transação Prisma Atômica
    return this.prisma.$transaction(async (tx) => {
      let totalItems = 0;
      let totalCost = 0;
      let totalEstimatedValue = 0;

      for (const item of dto.items) {
        totalItems += item.quantity;
        totalCost += item.quantity * (item.costPrice ?? 0);
        totalEstimatedValue += item.quantity * (item.sellingPrice ?? item.suggestedPrice ?? 0);
      }

      // 1. Cria cabeçalho do Envio
      const consignment = await tx.consignment.create({
        data: {
          companyId,
          locationId: dto.locationId,
          responsibleUserId: userId,
          shipmentNumber,
          date: dto.date ? new Date(dto.date) : new Date(),
          status: "SENT",
          totalItems,
          totalCost,
          totalEstimatedValue,
          notes: dto.notes?.trim() || null,
        },
      });

      // 2. Cria itens, atualiza estoque por parceiro e gera movimentações
      for (const item of dto.items) {
        const costPrice = item.costPrice ?? 0;
        const suggestedPrice = item.suggestedPrice ?? item.sellingPrice ?? 0;
        const sellingPrice = item.sellingPrice ?? suggestedPrice;
        const minPrice = item.minPrice ?? sellingPrice * 0.85;
        const commissionRate = item.commissionRate ?? Number(location.defaultCommissionRate);
        const commissionType = item.commissionType || location.defaultCommissionType;

        // Cria item de envio
        await tx.consignmentItem.create({
          data: {
            companyId,
            consignmentId: consignment.id,
            productId: item.productId || null,
            productName: item.productName.trim(),
            productSku: item.productSku?.trim() || null,
            quantity: item.quantity,
            costPrice,
            suggestedPrice,
            sellingPrice,
            minPrice,
            commissionRate,
            commissionType,
            notes: item.notes?.trim() || null,
          },
        });

        // Atualiza ou cria estoque no parceiro
        const existingStock = await tx.consignmentStock.findUnique({
          where: {
            locationId_productName: {
              locationId: dto.locationId,
              productName: item.productName.trim(),
            },
          },
        });

        if (existingStock) {
          await tx.consignmentStock.update({
            where: { id: existingStock.id },
            data: {
              quantityAvailable: { increment: item.quantity },
              costPrice,
              sellingPrice,
              deletedAt: null,
            },
          });
        } else {
          await tx.consignmentStock.create({
            data: {
              companyId,
              locationId: dto.locationId,
              productId: item.productId || null,
              productName: item.productName.trim(),
              productSku: item.productSku?.trim() || null,
              quantityAvailable: item.quantity,
              costPrice,
              sellingPrice,
            },
          });
        }

        // Registra movimentação de ENVIO (Histórico imutável)
        await tx.consignmentMovement.create({
          data: {
            companyId,
            locationId: dto.locationId,
            consignmentId: consignment.id,
            productId: item.productId || null,
            productName: item.productName.trim(),
            type: "ENVIO",
            quantity: item.quantity,
            unitCost: costPrice,
            unitPrice: sellingPrice,
            totalAmount: item.quantity * sellingPrice,
            referenceType: "SHIPMENT",
            referenceId: consignment.id,
            performedBy: userId,
            notes: `Envio consignado #${shipmentNumber} para ${location.name}`,
          },
        });
      }

      this.logger.log(`[Consignments] Envio ${shipmentNumber} criado com sucesso (${totalItems} peças).`);
      return consignment;
    });
  }

  // ==========================================
  // 4. ESTOQUE CONSIGNADO POR PARCEIRO
  // ==========================================

  async getStocks(companyId: string, locationId?: string) {
    return this.prisma.consignmentStock.findMany({
      where: {
        companyId,
        ...(locationId && { locationId }),
        deletedAt: null,
      },
      include: {
        location: { select: { id: true, name: true, city: true } },
      },
      orderBy: [{ location: { name: "asc" } }, { productName: "asc" }],
    });
  }

  // ==========================================
  // 5. REGISTRO DE VENDAS
  // ==========================================

  async getSales(companyId: string, locationId?: string) {
    return this.prisma.consignmentSale.findMany({
      where: {
        companyId,
        ...(locationId && { locationId }),
        deletedAt: null,
      },
      include: {
        location: { select: { id: true, name: true } },
        commission: true,
      },
      orderBy: { saleDate: "desc" },
    });
  }

  async registerSale(companyId: string, userId: string, dto: CreateSaleDto) {
    const location = await this.getLocationById(companyId, dto.locationId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Localiza o estoque do produto no parceiro
      const stock = await tx.consignmentStock.findUnique({
        where: {
          locationId_productName: {
            locationId: dto.locationId,
            productName: dto.productName.trim(),
          },
        },
      });

      if (!stock || stock.quantityAvailable < dto.quantity) {
        throw new BadRequestException(
          `Estoque insuficiente no parceiro. Disponível: ${stock?.quantityAvailable ?? 0}, Solicitado: ${dto.quantity}.`
        );
      }

      // 2. Cálculos financeiros
      const unitPrice = dto.unitPrice;
      const discount = dto.discount ?? 0;
      const grossAmount = unitPrice * dto.quantity;
      const netAmount = Math.max(0, grossAmount - discount);

      // Comissão do parceiro
      const commissionRate = Number(location.defaultCommissionRate);
      let partnerCommission = 0;
      if (location.defaultCommissionType === "FIXED") {
        partnerCommission = Number(location.defaultCommissionValue) * dto.quantity;
      } else {
        partnerCommission = (netAmount * commissionRate) / 100;
      }

      const farmRevenue = netAmount - partnerCommission;
      const costPrice = Number(stock.costPrice);
      const netProfit = farmRevenue - costPrice * dto.quantity;

      // 3. Atualiza estoque no parceiro
      await tx.consignmentStock.update({
        where: { id: stock.id },
        data: {
          quantityAvailable: { decrement: dto.quantity },
          quantitySold: { increment: dto.quantity },
        },
      });

      // 4. Cria registro de Venda
      const sale = await tx.consignmentSale.create({
        data: {
          companyId,
          locationId: dto.locationId,
          productId: dto.productId || stock.productId || null,
          productName: dto.productName.trim(),
          quantity: dto.quantity,
          saleDate: dto.saleDate ? new Date(dto.saleDate) : new Date(),
          unitPrice,
          grossAmount,
          discount,
          netAmount,
          partnerCommission,
          farmRevenue,
          costPrice,
          netProfit,
          registeredBy: userId,
          notes: dto.notes?.trim() || null,
        },
      });

      // 5. Gera lançamento de Comissão
      await tx.consignmentCommission.create({
        data: {
          companyId,
          locationId: dto.locationId,
          saleId: sale.id,
          ratePercent: commissionRate,
          calculatedAmount: partnerCommission,
          status: "CALCULATED",
        },
      });

      // 6. Registra movimentação de VENDA
      await tx.consignmentMovement.create({
        data: {
          companyId,
          locationId: dto.locationId,
          productId: dto.productId || stock.productId || null,
          productName: dto.productName.trim(),
          type: "VENDA",
          quantity: -dto.quantity,
          unitCost: costPrice,
          unitPrice,
          totalAmount: netAmount,
          referenceType: "SALE",
          referenceId: sale.id,
          performedBy: userId,
          notes: `Venda registrada no parceiro ${location.name} (Lucro Farm: R$ ${netProfit.toFixed(2)})`,
        },
      });

      this.logger.log(`[Consignments] Venda registrada para ${dto.productName} no parceiro ${location.name}.`);
      return sale;
    });
  }

  // ==========================================
  // 6. DEVOLUÇÕES (PARCIAL OU TOTAL)
  // ==========================================

  async registerReturn(companyId: string, userId: string, dto: CreateReturnDto) {
    const location = await this.getLocationById(companyId, dto.locationId);

    return this.prisma.$transaction(async (tx) => {
      const stock = await tx.consignmentStock.findUnique({
        where: {
          locationId_productName: {
            locationId: dto.locationId,
            productName: dto.productName.trim(),
          },
        },
      });

      if (!stock || stock.quantityAvailable < dto.quantity) {
        throw new BadRequestException(
          `Quantidade para devolução maior que o estoque atual. Disponível no parceiro: ${stock?.quantityAvailable ?? 0}.`
        );
      }

      const isDamaged = Boolean(dto.isDamaged);
      const movementType = isDamaged ? "AVARIA" : "DEVOLUCAO";

      // Atualiza estoque no parceiro
      await tx.consignmentStock.update({
        where: { id: stock.id },
        data: {
          quantityAvailable: { decrement: dto.quantity },
          ...(isDamaged
            ? { quantityDamaged: { increment: dto.quantity } }
            : { quantityReturned: { increment: dto.quantity } }),
        },
      });

      // Registra movimentação
      const movement = await tx.consignmentMovement.create({
        data: {
          companyId,
          locationId: dto.locationId,
          productId: dto.productId || stock.productId || null,
          productName: dto.productName.trim(),
          type: movementType,
          quantity: -dto.quantity,
          unitCost: stock.costPrice,
          unitPrice: stock.sellingPrice,
          totalAmount: dto.quantity * Number(stock.sellingPrice),
          referenceType: "RETURN",
          performedBy: userId,
          notes: dto.notes?.trim() || `Devolução de produtos do parceiro ${location.name}`,
        },
      });

      this.logger.log(`[Consignments] ${movementType} de ${dto.quantity}x ${dto.productName} registrada.`);
      return movement;
    });
  }

  // ==========================================
  // 7. ACERTOS FINANCEIROS & PAGAMENTOS
  // ==========================================

  async getSettlements(companyId: string, locationId?: string) {
    return this.prisma.consignmentSettlement.findMany({
      where: {
        companyId,
        ...(locationId && { locationId }),
        deletedAt: null,
      },
      include: {
        location: { select: { id: true, name: true, city: true } },
        payments: { orderBy: { paymentDate: "desc" } },
        _count: { select: { sales: true } },
      },
      orderBy: { periodEnd: "desc" },
    });
  }

  async createSettlement(companyId: string, dto: CreateSettlementDto) {
    const location = await this.getLocationById(companyId, dto.locationId);

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    const dueDate = new Date(dto.dueDate);

    return this.prisma.$transaction(async (tx) => {
      // Localiza todas as vendas não faturadas no período
      const sales = await tx.consignmentSale.findMany({
        where: {
          companyId,
          locationId: dto.locationId,
          settlementId: null,
          deletedAt: null,
          saleDate: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      if (sales.length === 0) {
        throw new BadRequestException("Nenhuma venda pendente de acerto encontrada no período selecionado.");
      }

      let totalSoldQuantity = 0;
      let totalSoldAmount = 0;
      let totalCommission = 0;
      let totalToReceive = 0;

      for (const s of sales) {
        totalSoldQuantity += s.quantity;
        totalSoldAmount += Number(s.grossAmount);
        totalCommission += Number(s.partnerCommission);
        totalToReceive += Number(s.farmRevenue);
      }

      // Gera número sequencial de acerto: ACERTO-YYYY-XXXX
      const currentYear = new Date().getFullYear();
      const countThisYear = await tx.consignmentSettlement.count({
        where: { companyId },
      });
      const settlementNumber = `ACERTO-${currentYear}-${String(countThisYear + 1).padStart(4, "0")}`;

      const settlement = await tx.consignmentSettlement.create({
        data: {
          companyId,
          locationId: dto.locationId,
          settlementNumber,
          periodStart,
          periodEnd,
          totalSoldQuantity,
          totalSoldAmount,
          totalCommission,
          totalToReceive,
          totalPaid: 0,
          balanceDue: totalToReceive,
          dueDate,
          status: "PENDING",
          notes: dto.notes?.trim() || null,
        },
      });

      // Vincula as vendas ao acerto
      await tx.consignmentSale.updateMany({
        where: { id: { in: sales.map((s) => s.id) } },
        data: { settlementId: settlement.id },
      });

      this.logger.log(`[Consignments] Acerto financeiro ${settlementNumber} criado com sucesso (Total Farm: R$ ${totalToReceive.toFixed(2)}).`);
      return settlement;
    });
  }

  async registerPayment(companyId: string, userId: string, dto: CreatePaymentDto) {
    const settlement = await this.prisma.consignmentSettlement.findFirst({
      where: { id: dto.settlementId, companyId, deletedAt: null },
    });

    if (!settlement) {
      throw new NotFoundException("Acerto financeiro não encontrado.");
    }

    if (settlement.status === "PAID") {
      throw new BadRequestException("Este acerto financeiro já se encontra totalmente quitado.");
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.consignmentPayment.create({
        data: {
          companyId,
          settlementId: dto.settlementId,
          locationId: settlement.locationId,
          amount: dto.amount,
          method: dto.method,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          receiptUrl: dto.receiptUrl?.trim() || null,
          transactionReference: dto.transactionReference?.trim() || null,
          notes: dto.notes?.trim() || null,
          receivedBy: userId,
          status: "CONFIRMED",
        },
      });

      const newPaid = Number(settlement.totalPaid) + dto.amount;
      const newBalance = Math.max(0, Number(settlement.totalToReceive) - newPaid);
      const newStatus = newBalance <= 0.01 ? "PAID" : "PENDING";

      await tx.consignmentSettlement.update({
        where: { id: settlement.id },
        data: {
          totalPaid: newPaid,
          balanceDue: newBalance,
          status: newStatus,
        },
      });

      // Atualiza comissões vinculadas como SETTLED se o acerto foi pago
      if (newStatus === "PAID") {
        const salesInSettlement = await tx.consignmentSale.findMany({
          where: { settlementId: settlement.id },
          select: { id: true },
        });
        await tx.consignmentCommission.updateMany({
          where: { saleId: { in: salesInSettlement.map((s) => s.id) } },
          data: { status: "SETTLED" },
        });
      }

      this.logger.log(`[Consignments] Pagamento de R$ ${dto.amount.toFixed(2)} registrado para o acerto ${settlement.settlementNumber}.`);
      return payment;
    });
  }

  // ==========================================
  // 8. MOVIMENTAÇÕES DE ESTOQUE (IMUTÁVEIS)
  // ==========================================

  async getMovements(companyId: string, locationId?: string) {
    return this.prisma.consignmentMovement.findMany({
      where: {
        companyId,
        ...(locationId && { locationId }),
        deletedAt: null,
      },
      include: {
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // ==========================================
  // 9. RELATÓRIOS CONSOLIDADOS COM FILTROS
  // ==========================================

  async getReportData(
    companyId: string,
    query?: {
      startDate?: string;
      endDate?: string;
      locationId?: string;
      productName?: string;
      city?: string;
    }
  ) {
    const whereSale: Prisma.ConsignmentSaleWhereInput = {
      companyId,
      deletedAt: null,
      ...(query?.locationId && { locationId: query.locationId }),
      ...(query?.productName && { productName: { contains: query.productName, mode: "insensitive" } }),
      ...(query?.startDate && { saleDate: { gte: new Date(query.startDate) } }),
      ...(query?.endDate && { saleDate: { lte: new Date(query.endDate) } }),
      ...(query?.city && { location: { city: { contains: query.city, mode: "insensitive" } } }),
    };

    const sales = await this.prisma.consignmentSale.findMany({
      where: whereSale,
      include: { location: true },
      orderBy: { saleDate: "desc" },
    });

    const stocks = await this.prisma.consignmentStock.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(query?.locationId && { locationId: query.locationId }),
      },
      include: { location: true },
    });

    const settlements = await this.prisma.consignmentSettlement.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(query?.locationId && { locationId: query.locationId }),
      },
      include: { location: true, payments: true },
    });

    return {
      filters: query || {},
      generatedAt: new Date().toISOString(),
      sales,
      stocks,
      settlements,
    };
  }
}
