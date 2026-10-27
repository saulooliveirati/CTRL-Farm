import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service.js";
import type { CreateEquipmentDto, UpdateEquipmentDto } from "./dto/equipment.dto.js";

export interface WorkshopEquipmentItem {
  id: string;
  companyId: string;
  tabKey: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status: string;
  powerWatts?: number | null;
  acquisitionDate?: string | null;
  purchasePrice?: number | null;
  hourlyCost?: number | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, tabKey?: string) {
    if (tabKey) {
      return this.prisma.$queryRawUnsafe<WorkshopEquipmentItem[]>(
        `SELECT * FROM "WorkshopEquipment" WHERE "companyId" = $1 AND "tabKey" = $2 ORDER BY "name" ASC`,
        companyId,
        tabKey,
      );
    }
    return this.prisma.$queryRawUnsafe<WorkshopEquipmentItem[]>(
      `SELECT * FROM "WorkshopEquipment" WHERE "companyId" = $1 ORDER BY "tabKey" ASC, "name" ASC`,
      companyId,
    );
  }

  async findOne(companyId: string, id: string) {
    const items = await this.prisma.$queryRawUnsafe<WorkshopEquipmentItem[]>(
      `SELECT * FROM "WorkshopEquipment" WHERE "id" = $1 AND "companyId" = $2`,
      id,
      companyId,
    );
    if (!items.length || !items[0]) throw new NotFoundException("Equipamento não encontrado.");
    return items[0];
  }

  async create(companyId: string, dto: CreateEquipmentDto) {
    const id = randomUUID();
    const acqDate = dto.acquisitionDate ? new Date(dto.acquisitionDate) : null;

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "WorkshopEquipment" (
        "id", "companyId", "tabKey", "name", "brand", "model", "serialNumber",
        "status", "powerWatts", "acquisitionDate", "purchasePrice", "hourlyCost",
        "location", "notes", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, NOW(), NOW()
      )`,
      id,
      companyId,
      dto.tabKey.trim().toLowerCase(),
      dto.name.trim(),
      dto.brand?.trim() || null,
      dto.model?.trim() || null,
      dto.serialNumber?.trim() || null,
      dto.status?.trim() || "OPERATIONAL",
      dto.powerWatts !== undefined ? Number(dto.powerWatts) : null,
      acqDate,
      dto.purchasePrice !== undefined ? Number(dto.purchasePrice) : null,
      dto.hourlyCost !== undefined ? Number(dto.hourlyCost) : null,
      dto.location?.trim() || null,
      dto.notes?.trim() || null,
    );

    return this.findOne(companyId, id);
  }

  async update(companyId: string, id: string, dto: UpdateEquipmentDto) {
    const current = await this.findOne(companyId, id);
    const acqDate =
      dto.acquisitionDate !== undefined
        ? dto.acquisitionDate
          ? new Date(dto.acquisitionDate)
          : null
        : current.acquisitionDate
          ? new Date(current.acquisitionDate)
          : null;

    await this.prisma.$executeRawUnsafe(
      `UPDATE "WorkshopEquipment" SET
        "tabKey" = $1,
        "name" = $2,
        "brand" = $3,
        "model" = $4,
        "serialNumber" = $5,
        "status" = $6,
        "powerWatts" = $7,
        "acquisitionDate" = $8,
        "purchasePrice" = $9,
        "hourlyCost" = $10,
        "location" = $11,
        "notes" = $12,
        "updatedAt" = NOW()
       WHERE "id" = $13 AND "companyId" = $14`,
      dto.tabKey !== undefined ? dto.tabKey.trim().toLowerCase() : current.tabKey,
      dto.name !== undefined ? dto.name.trim() : current.name,
      dto.brand !== undefined ? dto.brand?.trim() || null : current.brand,
      dto.model !== undefined ? dto.model?.trim() || null : current.model,
      dto.serialNumber !== undefined ? dto.serialNumber?.trim() || null : current.serialNumber,
      dto.status !== undefined ? dto.status?.trim() || "OPERATIONAL" : current.status,
      dto.powerWatts !== undefined ? Number(dto.powerWatts) : current.powerWatts,
      acqDate,
      dto.purchasePrice !== undefined ? Number(dto.purchasePrice) : current.purchasePrice,
      dto.hourlyCost !== undefined ? Number(dto.hourlyCost) : current.hourlyCost,
      dto.location !== undefined ? dto.location?.trim() || null : current.location,
      dto.notes !== undefined ? dto.notes?.trim() || null : current.notes,
      id,
      companyId,
    );

    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    const res = await this.prisma.$executeRawUnsafe(
      `DELETE FROM "WorkshopEquipment" WHERE "id" = $1 AND "companyId" = $2`,
      id,
      companyId,
    );
    if (res === 0) throw new NotFoundException("Equipamento não encontrado.");
    return { success: true, id };
  }
}
