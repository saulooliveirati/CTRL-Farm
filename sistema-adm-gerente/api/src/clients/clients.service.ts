import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { CtrlFarmNotifierService } from "../integrations/ctrlfarm-notifier.service.js";
import { CreateClientDto, UpdateClientDto } from "./dto/create-client.dto.js";

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctrlFarmNotifier: CtrlFarmNotifierService,
  ) {}

  async findAll(query?: { search?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.search) {
      const q = query.search.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { tradeName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { document: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          subscriptions: {
            where: { status: "ATIVO" },
            include: { plan: true },
            take: 1,
          },
          licenses: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              activationKey: true,
              status: true,
              expiresAt: true,
              lastValidatedAt: true,
            },
          },
          _count: {
            select: {
              subscriptions: true,
              licenses: true,
            },
          },
        },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
        licenses: {
          include: { plan: true },
          orderBy: { createdAt: "desc" },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Cliente com id ${id} não encontrado.`);
    }

    return client;
  }

  async create(dto: CreateClientDto, adminUsername?: string) {
    const existing = await this.prisma.client.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`Já existe um cliente cadastrado com o e-mail ${dto.email}`);
    }

    const client = await this.prisma.client.create({
      data: {
        name: dto.name.trim(),
        tradeName: dto.tradeName?.trim() || null,
        document: dto.document?.trim() || null,
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        contactPerson: dto.contactPerson?.trim() || null,
        notes: dto.notes?.trim() || null,
        status: "ACTIVE",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "CLIENT_CREATED",
        performedBy: adminUsername || "Administrador",
        clientId: client.id,
        targetType: "CLIENT",
        targetId: client.id,
        details: { name: client.name, email: client.email },
      },
    });

    return client;
  }

  async update(id: string, dto: UpdateClientDto, adminUsername?: string) {
    await this.findOne(id);

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.tradeName !== undefined ? { tradeName: dto.tradeName?.trim() || null } : {}),
        ...(dto.document !== undefined ? { document: dto.document?.trim() || null } : {}),
        ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.contactPerson !== undefined ? { contactPerson: dto.contactPerson?.trim() || null } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "CLIENT_UPDATED",
        performedBy: adminUsername || "Administrador",
        clientId: client.id,
        targetType: "CLIENT",
        targetId: client.id,
        details: { updatedFields: Object.keys(dto) },
      },
    });

    return client;
  }

  async changeStatus(id: string, status: string, adminUsername?: string) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.client.update({
      where: { id },
      data: { status: status as any },
    });

    const isSuspended = status === "SUSPENDED" || status === "SUSPENSO" || status === "INACTIVE";
    if (isSuspended) {
      // Suspende assinaturas e licenças vinculadas
      await this.prisma.subscription.updateMany({
        where: { clientId: id },
        data: { status: "SUSPENSO" },
      });
      await this.prisma.license.updateMany({
        where: { clientId: id },
        data: { status: "SUSPENDED" },
      });

      // Disparo IMEDIATO para o CTRL-Farm para travar o serviço
      const clientLicenses = await this.prisma.license.findMany({
        where: { clientId: id },
        select: { activationKey: true },
      });
      for (const lic of clientLicenses) {
        await this.ctrlFarmNotifier.notifyLicenseSuspension(
          lic.activationKey,
          `Cadastro do cliente alterado para status ${status} pelo administrador.`
        );
      }
    } else if (status === "ACTIVE") {
      await this.prisma.subscription.updateMany({
        where: { clientId: id },
        data: { status: "ATIVO" },
      });
      await this.prisma.license.updateMany({
        where: { clientId: id },
        data: { status: "ACTIVE" },
      });
      const clientLicenses = await this.prisma.license.findMany({
        where: { clientId: id },
        select: { activationKey: true, expiresAt: true },
      });
      for (const lic of clientLicenses) {
        await this.ctrlFarmNotifier.notifyLicenseActivation(
          lic.activationKey,
          lic.expiresAt.toISOString()
        );
      }
    }

    await this.prisma.auditLog.create({
      data: {
        action: `CLIENT_${status}`,
        performedBy: adminUsername || "Administrador",
        clientId: id,
        targetType: "CLIENT",
        targetId: id,
        details: { previousStatus: existing.status, newStatus: status },
      },
    });

    return updated;
  }

  async delete(id: string, adminUsername?: string) {
    const existing = await this.findOne(id);

    await this.prisma.licenseValidationLog.deleteMany({
      where: { license: { clientId: id } },
    });
    await this.prisma.license.deleteMany({
      where: { clientId: id },
    });
    await this.prisma.subscription.deleteMany({
      where: { clientId: id },
    });
    const deleted = await this.prisma.client.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "CLIENT_DELETED",
        performedBy: adminUsername || "Administrador",
        targetType: "CLIENT",
        targetId: id,
        details: { name: existing.name, email: existing.email },
      },
    });

    return { success: true, message: `Cliente "${existing.name}" excluído com sucesso.` };
  }
}
