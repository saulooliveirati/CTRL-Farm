import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service.js";
import type { CreateProductDto, UpdateProductDto } from "./dto/product.dto.js";

export interface ProductItem {
  id: string;
  companyId: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  sellingPrice: number;
  weightGrams?: number | null;
  dimensions?: string | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, search?: string) {
    if (search?.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      return this.prisma.$queryRawUnsafe<ProductItem[]>(
        `SELECT * FROM "Product"
         WHERE "companyId" = $1 AND (LOWER("name") LIKE $2 OR LOWER(COALESCE("sku", '')) LIKE $2 OR LOWER(COALESCE("category", '')) LIKE $2)
         ORDER BY "name" ASC`,
        companyId,
        q,
      );
    }
    return this.prisma.$queryRawUnsafe<ProductItem[]>(
      `SELECT * FROM "Product" WHERE "companyId" = $1 ORDER BY "name" ASC`,
      companyId,
    );
  }

  async findOne(companyId: string, id: string) {
    const items = await this.prisma.$queryRawUnsafe<ProductItem[]>(
      `SELECT * FROM "Product" WHERE "id" = $1 AND "companyId" = $2`,
      id,
      companyId,
    );
    if (!items.length || !items[0]) throw new NotFoundException("Produto não encontrado.");
    return items[0];
  }

  async create(companyId: string, dto: CreateProductDto) {
    const id = randomUUID();
    const qty = dto.quantity !== undefined ? Math.max(0, Number(dto.quantity)) : 0;
    const minQty = dto.minQuantity !== undefined ? Math.max(0, Number(dto.minQuantity)) : 0;
    const cost = dto.costPrice !== undefined ? Math.max(0, Number(dto.costPrice)) : 0;
    const sell = dto.sellingPrice !== undefined ? Math.max(0, Number(dto.sellingPrice)) : 0;
    const weight = dto.weightGrams !== undefined ? Number(dto.weightGrams) : null;

    let computedStatus = dto.status || "IN_STOCK";
    if (qty === 0) computedStatus = "OUT_OF_STOCK";
    else if (minQty > 0 && qty <= minQty) computedStatus = "LOW_STOCK";

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "Product" (
        "id", "companyId", "sku", "name", "category", "imageUrl",
        "quantity", "minQuantity", "costPrice", "sellingPrice",
        "weightGrams", "dimensions", "status", "notes", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14, NOW(), NOW()
      )`,
      id,
      companyId,
      dto.sku?.trim() || null,
      dto.name.trim(),
      dto.category?.trim() || null,
      dto.imageUrl?.trim() || null,
      qty,
      minQty,
      cost,
      sell,
      weight,
      dto.dimensions?.trim() || null,
      computedStatus,
      dto.notes?.trim() || null,
    );

    return this.findOne(companyId, id);
  }

  async update(companyId: string, id: string, dto: UpdateProductDto) {
    const current = await this.findOne(companyId, id);

    const qty = dto.quantity !== undefined ? Math.max(0, Number(dto.quantity)) : current.quantity;
    const minQty =
      dto.minQuantity !== undefined ? Math.max(0, Number(dto.minQuantity)) : current.minQuantity;
    const cost =
      dto.costPrice !== undefined ? Math.max(0, Number(dto.costPrice)) : current.costPrice;
    const sell =
      dto.sellingPrice !== undefined ? Math.max(0, Number(dto.sellingPrice)) : current.sellingPrice;
    const weight =
      dto.weightGrams !== undefined ? Number(dto.weightGrams) : (current.weightGrams ?? null);

    let computedStatus = dto.status !== undefined ? dto.status : current.status;
    if (dto.quantity !== undefined) {
      if (qty === 0) computedStatus = "OUT_OF_STOCK";
      else if (minQty > 0 && qty <= minQty) computedStatus = "LOW_STOCK";
      else if (computedStatus === "OUT_OF_STOCK" || computedStatus === "LOW_STOCK")
        computedStatus = "IN_STOCK";
    }

    await this.prisma.$executeRawUnsafe(
      `UPDATE "Product" SET
        "sku" = $1,
        "name" = $2,
        "category" = $3,
        "imageUrl" = $4,
        "quantity" = $5,
        "minQuantity" = $6,
        "costPrice" = $7,
        "sellingPrice" = $8,
        "weightGrams" = $9,
        "dimensions" = $10,
        "status" = $11,
        "notes" = $12,
        "updatedAt" = NOW()
       WHERE "id" = $13 AND "companyId" = $14`,
      dto.sku !== undefined ? dto.sku?.trim() || null : current.sku,
      dto.name !== undefined ? dto.name.trim() : current.name,
      dto.category !== undefined ? dto.category?.trim() || null : current.category,
      dto.imageUrl !== undefined ? dto.imageUrl?.trim() || null : current.imageUrl,
      qty,
      minQty,
      cost,
      sell,
      weight,
      dto.dimensions !== undefined ? dto.dimensions?.trim() || null : current.dimensions,
      computedStatus,
      dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
      id,
      companyId,
    );

    return this.findOne(companyId, id);
  }

  async adjustStock(companyId: string, id: string, delta: number) {
    const current = await this.findOne(companyId, id);
    const newQty = Math.max(0, current.quantity + delta);

    let newStatus = current.status;
    if (newQty === 0) newStatus = "OUT_OF_STOCK";
    else if (current.minQuantity > 0 && newQty <= current.minQuantity) newStatus = "LOW_STOCK";
    else if (newStatus === "OUT_OF_STOCK" || newStatus === "LOW_STOCK") newStatus = "IN_STOCK";

    await this.prisma.$executeRawUnsafe(
      `UPDATE "Product" SET "quantity" = $1, "status" = $2, "updatedAt" = NOW()
       WHERE "id" = $3 AND "companyId" = $4`,
      newQty,
      newStatus,
      id,
      companyId,
    );

    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    const res = await this.prisma.$executeRawUnsafe(
      `DELETE FROM "Product" WHERE "id" = $1 AND "companyId" = $2`,
      id,
      companyId,
    );
    if (res === 0) throw new NotFoundException("Produto não encontrado.");
    return { success: true, id };
  }
}
