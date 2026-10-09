import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service.js";
import { CreatePrinterDto } from "./dto/create-printer.dto.js";
import { UpdatePrinterDto } from "./dto/update-printer.dto.js";

@Injectable()
export class PrintersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.printer.findMany({
      where: { companyId },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(companyId: string, dto: CreatePrinterDto) {
    await this.ensureSupplier(companyId, dto.supplierId);
    try {
      return await this.prisma.printer.create({
        data: {
          companyId,
          name: dto.name.trim(),
          manufacturer: dto.manufacturer?.trim() || null,
          model: dto.model?.trim() || null,
          serialNumber: dto.serialNumber?.trim() || null,
          location: dto.location?.trim() || null,
          notes: dto.notes?.trim() || null,
          status: dto.status,
          supplierId: dto.supplierId || null,
        },
        include: { supplier: { select: { id: true, name: true } } },
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Já existe uma impressora com este nome.");
      }
      throw error;
    }
  }

  async update(companyId: string, id: string, dto: UpdatePrinterDto) {
    await this.ensureOwned(companyId, id);
    await this.ensureSupplier(companyId, dto.supplierId);
    try {
      return await this.prisma.printer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.manufacturer !== undefined && { manufacturer: dto.manufacturer.trim() || null }),
          ...(dto.model !== undefined && { model: dto.model.trim() || null }),
          ...(dto.serialNumber !== undefined && { serialNumber: dto.serialNumber.trim() || null }),
          ...(dto.location !== undefined && { location: dto.location.trim() || null }),
          ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.supplierId !== undefined && { supplierId: dto.supplierId || null }),
        },
        include: { supplier: { select: { id: true, name: true } } },
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Já existe uma impressora com este nome.");
      }
      throw error;
    }
  }

  async remove(companyId: string, id: string) {
    const printer = await this.prisma.printer.findFirst({ where: { id, companyId }, select: { id: true, _count: { select: { productionJobs: true } } } });
    if (!printer) throw new NotFoundException("Impressora não encontrada.");
    if (printer._count.productionJobs > 0) throw new ConflictException("Esta impressora possui histórico de produção e não pode ser excluída. Altere seu status para manutenção ou inativa.");
    await this.prisma.printer.delete({ where: { id } });
    return { id };
  }

  private async ensureOwned(companyId: string, id: string) {
    const printer = await this.prisma.printer.findFirst({ where: { id, companyId }, select: { id: true } });
    if (!printer) throw new NotFoundException("Impressora não encontrada.");
  }

  private async ensureSupplier(companyId: string, supplierId?: string | null) {
    if (!supplierId) return;
    const supplier = await this.prisma.supplier.findFirst({ where: { id: supplierId, companyId }, select: { id: true } });
    if (!supplier) throw new NotFoundException("Fornecedor não encontrado nesta empresa.");
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
