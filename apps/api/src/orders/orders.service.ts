import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";
import { CreateOrderDto } from "./dto/create-order.dto.js";
import { UpdateOrderDto } from "./dto/update-order.dto.js";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    const orders = await this.prisma.customerOrder.findMany({
      where: { companyId },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
        productionJobs: { select: { id: true, name: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return orders.map((order) => ({
      ...order,
      productionJob: order.productionJobs[0] ?? null,
    }));
  }

  async create(companyId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado nesta empresa.");

    const hasItems = Array.isArray(dto.items) && dto.items.length > 0;
    const itemsData = hasItems
      ? dto.items!.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice,
          notes: item.notes?.trim() || null,
        }))
      : [];

    const totalQuantity = hasItems
      ? itemsData.reduce((acc, item) => acc + item.quantity, 0)
      : (dto.quantity ?? 1);

    const totalAmount = hasItems
      ? itemsData.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
      : dto.unitPrice
        ? (dto.quantity ?? 1) * dto.unitPrice
        : 0;

    const description = hasItems
      ? dto.description?.trim() || itemsData.map((i) => i.description).join(", ")
      : dto.description?.trim() || "Item sem descrição";

    const unitPrice = hasItems
      ? totalQuantity > 0
        ? Math.round((totalAmount / totalQuantity) * 100) / 100
        : 0
      : (dto.unitPrice ?? 0);

    const order = await this.prisma.customerOrder.create({
      data: {
        companyId,
        customerId: dto.customerId,
        description,
        quantity: totalQuantity,
        unitPrice,
        totalAmount,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        notes: dto.notes?.trim() || null,
        items: {
          create: hasItems
            ? itemsData
            : [
                {
                  description,
                  quantity: totalQuantity,
                  unitPrice,
                  notes: dto.notes?.trim() || null,
                },
              ],
        },
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
        productionJobs: { select: { id: true, name: true, status: true } },
      },
    });

    return {
      ...order,
      productionJob: order.productionJobs[0] ?? null,
    };
  }

  async cancel(companyId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findFirst({
        where: { id, companyId },
        include: { productionJobs: { select: { id: true, status: true } } },
      });
      if (!order) throw new NotFoundException("Pedido não encontrado.");
      if (order.status !== OrderStatus.DRAFT || order.productionJobs.length > 0) {
        throw new ConflictException(
          "Somente pedidos sem produção vinculada podem ser cancelados por aqui.",
        );
      }
      return tx.customerOrder.update({
        where: { id },
        data: { status: OrderStatus.CANCELLED },
        include: { customer: { select: { id: true, name: true } } },
      });
    });
  }

  async update(companyId: string, id: string, dto: UpdateOrderDto) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        status: true,
        productionJobs: { select: { id: true } },
      },
    });
    if (!order) throw new NotFoundException("Pedido não encontrado.");
    if (order.status !== OrderStatus.DRAFT || order.productionJobs.length > 0) {
      throw new ConflictException(
        "Somente orçamentos novos sem produção vinculada podem ser editados.",
      );
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, companyId },
        select: { id: true },
      });
      if (!customer) throw new NotFoundException("Cliente não encontrado nesta empresa.");
    }

    const hasItems = Array.isArray(dto.items) && dto.items.length > 0;
    const itemsData = hasItems
      ? dto.items!.map((item) => ({
          description: item.description.trim(),
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice,
          notes: item.notes?.trim() || null,
        }))
      : undefined;

    const totalQuantity = itemsData
      ? itemsData.reduce((acc, item) => acc + item.quantity, 0)
      : dto.quantity;

    const totalAmount = itemsData
      ? itemsData.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0)
      : dto.unitPrice !== undefined && dto.quantity !== undefined
        ? dto.quantity * dto.unitPrice
        : undefined;

    const description =
      itemsData && !dto.description
        ? itemsData.map((i) => i.description).join(", ")
        : dto.description?.trim();

    const unitPrice =
      itemsData && totalQuantity
        ? totalQuantity > 0
          ? Math.round(((totalAmount ?? 0) / totalQuantity) * 100) / 100
          : 0
        : dto.unitPrice;

    if (itemsData) {
      await this.prisma.orderItem.deleteMany({ where: { orderId: id } });
    }

    const updated = await this.prisma.customerOrder.update({
      where: { id },
      data: {
        ...(dto.customerId !== undefined && { customerId: dto.customerId }),
        ...(description !== undefined && { description }),
        ...(totalQuantity !== undefined && { quantity: totalQuantity }),
        ...(unitPrice !== undefined && { unitPrice }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(dto.dueAt !== undefined && {
          dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        ...(itemsData && {
          items: {
            create: itemsData,
          },
        }),
      },
      include: {
        customer: { select: { id: true, name: true } },
        items: true,
        productionJobs: { select: { id: true, name: true, status: true } },
      },
    });

    return {
      ...updated,
      productionJob: updated.productionJobs[0] ?? null,
    };
  }

  async remove(companyId: string, id: string) {
    const order = await this.prisma.customerOrder.findFirst({
      where: { id, companyId },
      select: { id: true, productionJobs: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException("Pedido não encontrado.");
    if (order.productionJobs.length > 0)
      throw new ConflictException(
        "Este pedido possui produção vinculada e não pode ser excluído. Mantenha-o para preservar o histórico.",
      );
    await this.prisma.customerOrder.delete({ where: { id } });
    return { id };
  }
}
