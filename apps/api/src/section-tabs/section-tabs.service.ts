import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service.js";
import type { CreateSectionTabDto, UpdateSectionTabDto } from "./dto/section-tab.dto.js";

export interface SectionTabItem {
  id: string;
  companyId: string;
  section: "EQUIPMENT" | "CONTACTS" | "INVENTORY";
  key: string;
  label: string;
  icon?: string | null;
  order: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const DEFAULT_SYSTEM_TABS: Record<string, Array<Omit<SectionTabItem, "companyId">>> = {
  EQUIPMENT: [
    {
      id: "sys-equipment-printers",
      section: "EQUIPMENT",
      key: "printers",
      label: "Impressoras 3D",
      icon: "fdm_printer",
      order: 0,
      isDefault: true,
    },
  ],
  CONTACTS: [
    {
      id: "sys-contacts-customers",
      section: "CONTACTS",
      key: "customers",
      label: "Clientes",
      icon: "customers",
      order: 0,
      isDefault: true,
    },
    {
      id: "sys-contacts-suppliers",
      section: "CONTACTS",
      key: "suppliers",
      label: "Fornecedores",
      icon: "suppliers",
      order: 1,
      isDefault: true,
    },
  ],
  INVENTORY: [
    {
      id: "sys-inventory-filaments",
      section: "INVENTORY",
      key: "filaments",
      label: "Filamentos",
      icon: "filaments",
      order: 0,
      isDefault: true,
    },
    {
      id: "sys-inventory-materials",
      section: "INVENTORY",
      key: "materials",
      label: "Insumos",
      icon: "materials",
      order: 1,
      isDefault: true,
    },
    {
      id: "sys-inventory-products",
      section: "INVENTORY",
      key: "products",
      label: "Produtos",
      icon: "products",
      order: 2,
      isDefault: true,
    },
  ],
};

@Injectable()
export class SectionTabsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, section?: string | string[]) {
    const rawSection = Array.isArray(section) ? section[0] : section;
    const normalized = (rawSection?.trim().toUpperCase() ?? "ALL") as
      | "EQUIPMENT"
      | "CONTACTS"
      | "INVENTORY"
      | "ALL";

    if (!normalized || normalized === "ALL") {
      const [equipment, contacts, inventory] = await Promise.all([
        this.findForSection(companyId, "EQUIPMENT"),
        this.findForSection(companyId, "CONTACTS"),
        this.findForSection(companyId, "INVENTORY"),
      ]);
      return {
        EQUIPMENT: equipment,
        CONTACTS: contacts,
        INVENTORY: inventory,
      };
    }
    return this.findForSection(companyId, normalized as "EQUIPMENT" | "CONTACTS" | "INVENTORY");
  }

  private async findForSection(companyId: string, section: "EQUIPMENT" | "CONTACTS" | "INVENTORY") {
    const customTabs = (await this.prisma.$queryRawUnsafe<SectionTabItem[]>(
      `SELECT * FROM "CustomSectionTab" WHERE "companyId" = $1 AND "section" = $2 ORDER BY "order" ASC, "createdAt" ASC`,
      companyId,
      section,
    )) as SectionTabItem[];

    const defaults = (DEFAULT_SYSTEM_TABS[section] ?? []).map((t) => ({
      ...t,
      companyId,
    }));

    // Mescla padrões e customizados
    const all = [...defaults];
    for (const c of customTabs) {
      if (!all.some((a) => a.key === c.key)) {
        all.push({ ...c, isDefault: false });
      }
    }

    return all.sort((a, b) => a.order - b.order);
  }

  async create(companyId: string, dto: CreateSectionTabDto) {
    const rawKey = dto.key
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, "");
    if (!rawKey) throw new BadRequestException("Chave identificadora da aba inválida.");

    // Verifica se chave já existe nos padrões
    const defaults = DEFAULT_SYSTEM_TABS[dto.section] ?? [];
    if (defaults.some((d) => d.key === rawKey)) {
      throw new BadRequestException("Esta chave de aba já é padrão do sistema.");
    }

    const existing = await this.prisma.$queryRawUnsafe<SectionTabItem[]>(
      `SELECT id FROM "CustomSectionTab" WHERE "companyId" = $1 AND "section" = $2 AND "key" = $3`,
      companyId,
      dto.section,
      rawKey,
    );
    if (existing.length > 0) {
      throw new BadRequestException("Já existe uma aba com este identificador nesta seção.");
    }

    // Calcula próximo order
    const maxOrderRes = await this.prisma.$queryRawUnsafe<Array<{ max: number | null }>>(
      `SELECT MAX("order") as max FROM "CustomSectionTab" WHERE "companyId" = $1 AND "section" = $2`,
      companyId,
      dto.section,
    );
    const nextOrder = (maxOrderRes[0]?.max ?? defaults.length - 1) + 1;

    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "CustomSectionTab" ("id", "companyId", "section", "key", "label", "icon", "order", "isDefault", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW(), NOW())`,
      id,
      companyId,
      dto.section,
      rawKey,
      dto.label.trim(),
      dto.icon?.trim() || null,
      nextOrder,
    );

    return {
      id,
      companyId,
      section: dto.section,
      key: rawKey,
      label: dto.label.trim(),
      icon: dto.icon?.trim() || null,
      order: nextOrder,
      isDefault: false,
    };
  }

  async update(companyId: string, id: string, dto: UpdateSectionTabDto) {
    if (id.startsWith("sys-")) {
      throw new BadRequestException("Abas padrão do sistema não podem ser renomeadas.");
    }

    const tab = await this.prisma.$queryRawUnsafe<SectionTabItem[]>(
      `SELECT * FROM "CustomSectionTab" WHERE "id" = $1 AND "companyId" = $2`,
      id,
      companyId,
    );
    if (!tab.length || !tab[0]) throw new NotFoundException("Aba customizada não encontrada.");

    const current = tab[0];
    const newLabel = dto.label !== undefined ? dto.label.trim() : current.label;
    const newIcon = dto.icon !== undefined ? dto.icon?.trim() || null : current.icon;
    const newOrder = dto.order !== undefined ? Number(dto.order) : current.order;

    await this.prisma.$executeRawUnsafe(
      `UPDATE "CustomSectionTab" SET "label" = $1, "icon" = $2, "order" = $3, "updatedAt" = NOW()
       WHERE "id" = $4 AND "companyId" = $5`,
      newLabel,
      newIcon,
      newOrder,
      id,
      companyId,
    );

    return {
      ...current,
      label: newLabel,
      icon: newIcon,
      order: newOrder,
    };
  }

  async reorder(
    companyId: string,
    section: "EQUIPMENT" | "CONTACTS" | "INVENTORY",
    items: Array<{ key: string; order: number }>,
  ) {
    for (const item of items) {
      if (!item.key.startsWith("sys-")) {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "CustomSectionTab" SET "order" = $1, "updatedAt" = NOW()
           WHERE "companyId" = $2 AND "section" = $3 AND "key" = $4`,
          item.order,
          companyId,
          section,
          item.key,
        );
      }
    }
    return this.findAll(companyId, section);
  }

  async remove(companyId: string, id: string) {
    if (id.startsWith("sys-")) {
      throw new BadRequestException("Abas padrão do sistema não podem ser excluídas.");
    }
    const res = await this.prisma.$executeRawUnsafe(
      `DELETE FROM "CustomSectionTab" WHERE "id" = $1 AND "companyId" = $2`,
      id,
      companyId,
    );
    if (res === 0) throw new NotFoundException("Aba customizada não encontrada.");
    return { success: true, id };
  }
}
