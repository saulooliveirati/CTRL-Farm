import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { OrderStatus, ProductionStatus } from "@prisma/client";

import { PrismaService } from "../database/prisma.service.js";
import { CreateProductionDto } from "./dto/create-production.dto.js";
import { UpdateProductionDto } from "./dto/update-production.dto.js";

@Injectable()
export class ProductionService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.productionJob.findMany({
      where: { companyId },
      include: {
        printer: { select: { id: true, name: true } },
        filament: { select: { id: true, material: true, brand: true, color: true } },
        order: { select: { id: true, description: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(companyId: string, dto: CreateProductionDto) {
    const [printer, filament, order] = await Promise.all([
      this.prisma.printer.findFirst({ where: { id: dto.printerId, companyId }, select: { id: true } }),
      this.prisma.filament.findFirst({ where: { id: dto.filamentId, companyId }, select: { id: true, currentWeightG: true } }),
      dto.orderId ? this.prisma.customerOrder.findFirst({ where: { id: dto.orderId, companyId, status: OrderStatus.DRAFT, productionJob: null }, select: { id: true } }) : Promise.resolve(undefined),
    ]);
    if (!printer) throw new NotFoundException("Impressora não encontrada nesta empresa.");
    if (!filament) throw new NotFoundException("Bobina não encontrada nesta empresa.");
    if (dto.orderId && !order) throw new ConflictException("Pedido não encontrado, já enviado para produção ou encerrado.");
    if (filament.currentWeightG < dto.plannedWeightG) throw new BadRequestException("Estoque insuficiente para o consumo estimado.");
    return this.prisma.productionJob.create({
      data: {
        companyId,
        printerId: dto.printerId,
        filamentId: dto.filamentId,
        orderId: dto.orderId ?? null,
        name: dto.name.trim(),
        plannedWeightG: dto.plannedWeightG,
        notes: dto.notes?.trim() || null,
      },
      include: {
        printer: { select: { id: true, name: true } },
        filament: { select: { id: true, material: true, brand: true, color: true } },
        order: { select: { id: true, description: true } },
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateProductionDto) {
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.productionJob.findFirst({ where: { id, companyId } });
      if (!job) throw new NotFoundException("Ordem de produção não encontrada.");
      if (!this.isAllowedTransition(job.status, dto.status)) {
        throw new ConflictException(`Não é possível alterar de ${job.status} para ${dto.status}.`);
      }

      let actualWeightG: number | undefined;
      if (dto.status === ProductionStatus.COMPLETED) {
        actualWeightG = dto.actualWeightG ?? job.plannedWeightG;
        const deduction = await tx.filament.updateMany({
          where: { id: job.filamentId, companyId, currentWeightG: { gte: actualWeightG } },
          data: { currentWeightG: { decrement: actualWeightG } },
        });
        if (deduction.count === 0) throw new BadRequestException("Estoque insuficiente para concluir esta produção.");
      }

      if (dto.status === ProductionStatus.PRINTING) {
        const activeJob = await tx.productionJob.findFirst({
          where: { printerId: job.printerId, status: { in: [ProductionStatus.PRINTING, ProductionStatus.PAUSED] }, id: { not: job.id } },
          select: { id: true },
        });
        if (activeJob) throw new ConflictException("Esta impressora já possui uma produção em andamento.");
        await tx.printer.update({ where: { id: job.printerId }, data: { status: "PRINTING" } });
        if (job.orderId) await tx.customerOrder.update({ where: { id: job.orderId }, data: { status: OrderStatus.IN_PRODUCTION } });
      } else if (dto.status === ProductionStatus.PAUSED) {
        await tx.printer.update({ where: { id: job.printerId }, data: { status: "PAUSED" } });
      } else if (
        (dto.status === ProductionStatus.COMPLETED || dto.status === ProductionStatus.FAILED || dto.status === ProductionStatus.CANCELLED) &&
        (job.status === ProductionStatus.PRINTING || job.status === ProductionStatus.PAUSED)
      ) {
        await tx.printer.update({ where: { id: job.printerId }, data: { status: "READY" } });
      }

      if (dto.status === ProductionStatus.COMPLETED && job.orderId) {
        await tx.customerOrder.update({ where: { id: job.orderId }, data: { status: OrderStatus.COMPLETED } });
      } else if (dto.status === ProductionStatus.CANCELLED && job.orderId) {
        await tx.customerOrder.update({ where: { id: job.orderId }, data: { status: OrderStatus.CANCELLED } });
      }

      return tx.productionJob.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.status === ProductionStatus.PRINTING && !job.startedAt && { startedAt: new Date() }),
          ...(dto.status === ProductionStatus.COMPLETED && { completedAt: new Date(), actualWeightG }),
        },
        include: {
          printer: { select: { id: true, name: true } },
          filament: { select: { id: true, material: true, brand: true, color: true } },
          order: { select: { id: true, description: true } },
        },
      });
    });
  }

  private isAllowedTransition(from: ProductionStatus, to: ProductionStatus) {
    const transitions: Record<ProductionStatus, ProductionStatus[]> = {
      QUEUED: [ProductionStatus.PRINTING, ProductionStatus.CANCELLED],
      PRINTING: [ProductionStatus.PAUSED, ProductionStatus.COMPLETED, ProductionStatus.FAILED],
      PAUSED: [ProductionStatus.PRINTING, ProductionStatus.COMPLETED, ProductionStatus.FAILED, ProductionStatus.CANCELLED],
      COMPLETED: [], FAILED: [ProductionStatus.PRINTING], CANCELLED: [],
    };
    return transitions[from].includes(to);
  }
}
