import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service.js";
import { CreateSupplierDto } from "./dto/create-supplier.dto.js";
import { UpdateSupplierDto } from "./dto/update-supplier.dto.js";

@Injectable()
export class SuppliersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.supplier.findMany({ where: { companyId }, orderBy: { name: "asc" } });
  }

  async create(companyId: string, dto: CreateSupplierDto) {
    try {
      return await this.prisma.supplier.create({
        data: {
          companyId,
          name: dto.name.trim(),
          document: dto.document?.trim() || null,
          email: dto.email?.trim().toLowerCase() || null,
          phone: dto.phone?.trim() || null,
          address: dto.address?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error))
        throw new ConflictException("Já existe um fornecedor com estes dados.");
      throw error;
    }
  }

  async update(companyId: string, id: string, dto: UpdateSupplierDto) {
    await this.ensureOwned(companyId, id);
    try {
      return await this.prisma.supplier.update({ where: { id }, data: this.normalize(dto) });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error))
        throw new ConflictException("Já existe um fornecedor com estes dados.");
      throw error;
    }
  }

  async remove(companyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        _count: { select: { printers: true, filaments: true, inventoryMaterials: true } },
      },
    });
    if (!supplier) throw new NotFoundException("Fornecedor não encontrado.");
    if (
      supplier._count.printers + supplier._count.filaments + supplier._count.inventoryMaterials >
      0
    ) {
      throw new ConflictException(
        "Este fornecedor está vinculado a equipamentos ou materiais cadastrados.",
      );
    }
    await this.prisma.supplier.delete({ where: { id } });
    return { id };
  }

  private async ensureOwned(companyId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException("Fornecedor não encontrado.");
  }

  private normalize(dto: CreateSupplierDto | UpdateSupplierDto) {
    return {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.document !== undefined && { document: dto.document.trim() || null }),
      ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase() || null }),
      ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
      ...(dto.address !== undefined && { address: dto.address.trim() || null }),
      ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
