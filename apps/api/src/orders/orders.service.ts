import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";
import { CreateOrderDto } from "./dto/create-order.dto.js";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.customerOrder.findMany({
      where: { companyId },
      include: {
        customer: { select: { id: true, name: true } },
        productionJob: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(companyId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, companyId }, select: { id: true } });
    if (!customer) throw new NotFoundException("Cliente não encontrado nesta empresa.");
    return this.prisma.customerOrder.create({
      data: {
        companyId,
        customerId: dto.customerId,
        description: dto.description.trim(),
        quantity: dto.quantity ?? 1,
        unitPrice: dto.unitPrice,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        notes: dto.notes?.trim() || null,
      },
      include: {
        customer: { select: { id: true, name: true } },
        productionJob: { select: { id: true, name: true, status: true } },
      },
    });
  }

  async cancel(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findFirst({
        where: { id, companyId },
        include: { productionJob: { select: { id: true, status: true } } },
      });
      if (!order) throw new NotFoundException("Pedido não encontrado.");
      if (order.status !== OrderStatus.DRAFT || order.productionJob) {
        throw new ConflictException("Somente pedidos sem produção iniciada podem ser cancelados por aqui.");
      }
      return tx.customerOrder.update({ where: { id }, data: { status: OrderStatus.CANCELLED }, include: { customer: { select: { id: true, name: true } } } });
    });
  }
}
