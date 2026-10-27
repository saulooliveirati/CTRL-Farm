import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service.js";
import { CreateInventoryMaterialDto } from "./dto/create-inventory-material.dto.js";
import { UpdateInventoryMaterialDto } from "./dto/update-inventory-material.dto.js";

@Injectable()
export class InventoryMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.inventoryMaterial.findMany({
      where: { companyId },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
  }

  async create(companyId: string, dto: CreateInventoryMaterialDto) {
    await this.ensureSupplier(companyId, dto.supplierId);
    try {
      return await this.prisma.inventoryMaterial.create({
        data: {
          companyId,
          name: dto.name.trim(),
          category: dto.category,
          unit: dto.unit.trim(),
          sku: dto.sku?.trim() || null,
          currentQuantity: dto.currentQuantity ?? 0,
          minimumQuantity: dto.minimumQuantity ?? 0,
          unitCost: dto.unitCost ?? null,
          supplierId: dto.supplierId || null,
          notes: dto.notes?.trim() || null,
        },
        include: { supplier: { select: { id: true, name: true } } },
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error))
        throw new ConflictException("Já existe um material com este código SKU.");
      throw error;
    }
  }

  async update(companyId: string, id: string, dto: UpdateInventoryMaterialDto) {
    const material = await this.prisma.inventoryMaterial.findFirst({ where: { id, companyId } });
    if (!material) throw new NotFoundException("Material não encontrado.");
    await this.ensureSupplier(companyId, dto.supplierId);
    try {
      return await this.prisma.inventoryMaterial.update({
        where: { id },
        data: this.normalize(dto),
        include: { supplier: { select: { id: true, name: true } } },
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error))
        throw new ConflictException("Já existe um material com este código SKU.");
      throw error;
    }
  }

  async remove(companyId: string, id: string) {
    const material = await this.prisma.inventoryMaterial.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!material) throw new NotFoundException("Material não encontrado.");
    await this.prisma.inventoryMaterial.delete({ where: { id } });
    return { id };
  }

  private async ensureSupplier(companyId: string, supplierId?: string | null) {
    if (!supplierId) return;
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, companyId },
      select: { id: true },
    });
    if (!supplier) throw new NotFoundException("Fornecedor não encontrado nesta empresa.");
  }

  private normalize(dto: CreateInventoryMaterialDto | UpdateInventoryMaterialDto) {
    return {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.unit !== undefined && { unit: dto.unit.trim() }),
      ...(dto.sku !== undefined && { sku: dto.sku.trim() || null }),
      ...(dto.currentQuantity !== undefined && { currentQuantity: dto.currentQuantity }),
      ...(dto.minimumQuantity !== undefined && { minimumQuantity: dto.minimumQuantity }),
      ...(dto.unitCost !== undefined && { unitCost: dto.unitCost }),
      ...(dto.supplierId !== undefined && { supplierId: dto.supplierId || null }),
      ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
