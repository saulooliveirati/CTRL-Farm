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
      where: { companyId, archivedAt: null },
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
        plannedDurationMinutes: dto.plannedDurationMinutes ?? null,
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
      if (job.status === ProductionStatus.COMPLETED && dto.status === undefined && dto.actualWeightG !== undefined) {
        const previousWeightG = job.actualWeightG ?? 0;
        const difference = dto.actualWeightG - previousWeightG;
        if (difference > 0) {
          const deduction = await tx.filament.updateMany({
            where: { id: job.filamentId, companyId, currentWeightG: { gte: difference } },
            data: { currentWeightG: { decrement: difference } },
          });
          if (deduction.count === 0) throw new BadRequestException("Estoque insuficiente para corrigir o consumo desta produção.");
        } else if (difference < 0) {
          await tx.filament.update({ where: { id: job.filamentId }, data: { currentWeightG: { increment: Math.abs(difference) } } });
        }
        return tx.productionJob.update({ where: { id }, data: { actualWeightG: dto.actualWeightG }, include: this.productionRelations() });
      }

      if (dto.status === undefined) throw new BadRequestException("Informe um novo status ou o consumo corrigido de uma produção concluída.");
      if (!this.isAllowedTransition(job.status, dto.status)) {
        throw new ConflictException(`Não é possível alterar de ${job.status} para ${dto.status}.`);
      }

      let actualWeightG: number | undefined;
      const now = new Date();
      const activeSegmentSeconds = job.activeSince ? Math.max(0, Math.floor((now.getTime() - job.activeSince.getTime()) / 1000)) : 0;
      let actualDurationSeconds = job.actualDurationSeconds;
      if (dto.status === ProductionStatus.COMPLETED) {
        actualWeightG = dto.actualWeightG ?? job.plannedWeightG;
        const deduction = await tx.filament.updateMany({
          where: { id: job.filamentId, companyId, currentWeightG: { gte: actualWeightG } },
          data: { currentWeightG: { decrement: actualWeightG } },
        });
        if (deduction.count === 0) throw new BadRequestException("Estoque insuficiente para concluir esta produção.");
      }

      if (dto.status === ProductionStatus.PAUSED || dto.status === ProductionStatus.COMPLETED || dto.status === ProductionStatus.FAILED || dto.status === ProductionStatus.CANCELLED) {
        actualDurationSeconds += activeSegmentSeconds;
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
          ...(dto.status === ProductionStatus.PRINTING && { activeSince: now, ...(!job.startedAt && { startedAt: now }) }),
          ...((dto.status === ProductionStatus.PAUSED || dto.status === ProductionStatus.COMPLETED || dto.status === ProductionStatus.FAILED || dto.status === ProductionStatus.CANCELLED) && { activeSince: null, actualDurationSeconds }),
          ...(dto.status === ProductionStatus.COMPLETED && { completedAt: now, actualWeightG }),
        },
        include: {
          printer: { select: { id: true, name: true } },
          filament: { select: { id: true, material: true, brand: true, color: true } },
          order: { select: { id: true, description: true } },
        },
      });
    });
  }

  async remove(companyId: string, id: string) {
    const job = await this.prisma.productionJob.findFirst({ where: { id, companyId }, select: { id: true, status: true, startedAt: true, actualWeightG: true } });
    if (!job) throw new NotFoundException("Ordem de produção não encontrada.");
    if (job.status === ProductionStatus.COMPLETED) {
      await this.prisma.productionJob.update({ where: { id }, data: { archivedAt: new Date() } });
      return { id, archived: true };
    }
    if ((job.status !== ProductionStatus.QUEUED && job.status !== ProductionStatus.CANCELLED) || job.startedAt || job.actualWeightG !== null) {
      throw new ConflictException("Esta produção possui histórico operacional e não pode ser excluída.");
    }
    await this.prisma.productionJob.delete({ where: { id } });
    return { id };
  }

  private productionRelations() {
    return {
      printer: { select: { id: true, name: true } },
      filament: { select: { id: true, material: true, brand: true, color: true } },
      order: { select: { id: true, description: true } },
    };
  }

  private isAllowedTransition(from: ProductionStatus, to: ProductionStatus) {
    const transitions: Record<ProductionStatus, ProductionStatus[]> = {
      QUEUED: [ProductionStatus.PRINTING, ProductionStatus.CANCELLED],
      PRINTING: [ProductionStatus.PAUSED, ProductionStatus.COMPLETED, ProductionStatus.FAILED, ProductionStatus.CANCELLED],
      PAUSED: [ProductionStatus.PRINTING, ProductionStatus.COMPLETED, ProductionStatus.FAILED, ProductionStatus.CANCELLED],
      COMPLETED: [], FAILED: [ProductionStatus.PRINTING], CANCELLED: [],
    };
    return transitions[from].includes(to);
  }
}
