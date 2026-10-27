import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PrismaService } from "../database/prisma.service.js";
import type { UpdateCompanyDto } from "./dto/update-company.dto.js";

export interface PermissionMatrixRow {
  module: string;
  viewer: boolean;
  operator: boolean;
  manager: boolean;
  admin: boolean;
}

export const DEFAULT_PERMISSIONS_MATRIX: PermissionMatrixRow[] = [
  {
    module: "Dashboard & Métricas Gerais",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Impressoras & Telemetria",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Editar Horas de Uso / Manutenção",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Cadastrar Nova Impressora 3D",
    viewer: false,
    operator: false,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Estoque de Filamentos",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Ajuste Manual de Peso do Carretel",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Cadastrar Nova Bobina de Filamento",
    viewer: false,
    operator: false,
    manager: true,
    admin: true,
  },
  {
    module: "Calculadora de Precificação & Custos",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Pleno Acesso a Custos & Depreciação",
    viewer: false,
    operator: false,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Fila de Produção",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Pausar, Retomar ou Cancelar Ordem",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Orçamentos Feitos",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Criar Novos Orçamentos de Clientes",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Baixar Arquivos 3D (STL, 3MF, G-Code)",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Visualizar Almoxarifado / Insumos",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  { module: "Cadastrar Novos Insumos", viewer: false, operator: false, manager: true, admin: true },
  { module: "Visualizar Clientes", viewer: true, operator: true, manager: true, admin: true },
  {
    module: "Cadastrar Novos Clientes",
    viewer: false,
    operator: false,
    manager: true,
    admin: true,
  },
  { module: "Visualizar Fornecedores", viewer: false, operator: false, manager: true, admin: true },
  { module: "Cadastrar Fornecedores", viewer: false, operator: false, manager: true, admin: true },
  {
    module: "Monitoramento de Vídeo / Câmeras",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "CTRL Bot (IA) - Dúvidas Gerais",
    viewer: true,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "CTRL Bot (IA) - Ações Operacionais",
    viewer: false,
    operator: true,
    manager: true,
    admin: true,
  },
  {
    module: "Gestão de Usuários & Configuração",
    viewer: false,
    operator: false,
    manager: false,
    admin: true,
  },
];

function resolvePermissionsStoragePath(): string {
  let curr = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = resolve(curr, "storage", "permissions", "matrix.json");
    if (existsSync(dirname(candidate))) {
      return candidate;
    }
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return resolve(process.cwd(), "storage", "permissions", "matrix.json");
}

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.company.findMany({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        document: true,
        email: true,
        phone: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async getMe(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        _count: {
          select: {
            users: true,
            printers: true,
            filaments: true,
            orders: true,
          },
        },
      },
    });

    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    return company;
  }

  async updateMe(companyId: string, dto: UpdateCompanyDto) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    const data: {
      name?: string;
      tradeName?: string | null;
      document?: string | null;
      email?: string | null;
      phone?: string | null;
    } = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) throw new BadRequestException("O nome da empresa não pode ficar vazio.");
      data.name = trimmedName;
    }

    if (dto.tradeName !== undefined) {
      data.tradeName = dto.tradeName.trim() || null;
    }

    if (dto.document !== undefined) {
      const cleanDoc = dto.document.trim();
      if (cleanDoc && cleanDoc !== company.document) {
        const existing = await this.prisma.company.findUnique({ where: { document: cleanDoc } });
        if (existing && existing.id !== companyId) {
          throw new ConflictException("Já existe uma empresa cadastrada com este CPF ou CNPJ.");
        }
      }
      data.document = cleanDoc || null;
    }

    if (dto.email !== undefined) {
      data.email = dto.email.trim().toLowerCase() || null;
    }

    if (dto.phone !== undefined) {
      data.phone = dto.phone.trim() || null;
    }

    const updated = await this.prisma.company.update({
      where: { id: companyId },
      data,
      include: {
        _count: {
          select: {
            users: true,
            printers: true,
            filaments: true,
            orders: true,
          },
        },
      },
    });

    return updated;
  }

  async getPermissions(companyId: string): Promise<PermissionMatrixRow[]> {
    try {
      const filePath = resolvePermissionsStoragePath();
      if (existsSync(filePath)) {
        const raw = readFileSync(filePath, "utf-8");
        const store = JSON.parse(raw) as Record<string, PermissionMatrixRow[]>;
        if (store[companyId] && Array.isArray(store[companyId])) {
          return store[companyId];
        }
      }
    } catch (_err) {
      // Retorna fallback padrão em caso de erro de leitura
    }
    return DEFAULT_PERMISSIONS_MATRIX;
  }

  async updatePermissions(
    companyId: string,
    permissions: PermissionMatrixRow[],
  ): Promise<PermissionMatrixRow[]> {
    if (!Array.isArray(permissions)) {
      throw new BadRequestException("Formato inválido de matriz de permissões.");
    }

    // Regra estrita de segurança: Administrador SEMPRE tem acesso total a todos os módulos
    const sanitized: PermissionMatrixRow[] = permissions.map((row) => ({
      module: String(row.module || "").trim(),
      viewer: Boolean(row.viewer),
      operator: Boolean(row.operator),
      manager: Boolean(row.manager),
      admin: true, // Imutável por segurança
    }));

    try {
      const filePath = resolvePermissionsStoragePath();
      const dir = dirname(filePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      let store: Record<string, PermissionMatrixRow[]> = {};
      if (existsSync(filePath)) {
        try {
          store = JSON.parse(readFileSync(filePath, "utf-8"));
        } catch {
          store = {};
        }
      }

      store[companyId] = sanitized;
      writeFileSync(filePath, JSON.stringify(store, null, 2), "utf-8");
    } catch (_err) {
      // Se falhar o filesystem, ainda retorna a matriz sanitizada
    }

    return sanitized;
  }
}
