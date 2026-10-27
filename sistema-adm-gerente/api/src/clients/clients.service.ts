import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { CtrlFarmNotifierService } from "../integrations/ctrlfarm-notifier.service.js";
import { LicensesService } from "../licenses/licenses.service.js";
import { EmailService } from "../email/email.service.js";
import { FirebaseService } from "../firebase/firebase.service.js";
import {
  CreateClientDto,
  UpdateClientDto,
  PendingRegistrationDto,
  ApproveRegistrationDto,
} from "./dto/create-client.dto.js";

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ctrlFarmNotifier: CtrlFarmNotifierService,
    private readonly licensesService: LicensesService,
    private readonly emailService: EmailService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async findAll(query?: { search?: string; status?: string; page?: number; limit?: number }) {
    // Sincroniza cadastros pendentes do Firebase Firestore (caso o ADM estivesse fechado durante o registro no CTRL-Farm)
    try {
      const firestore = this.firebaseService.getFirestore();
      if (firestore) {
        const snapshot = await firestore
          .collection("pending_registrations")
          .where("status", "==", "PENDING")
          .get();

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const email = (data.adminEmail || data.email || doc.id).trim().toLowerCase();
          const existing = await this.prisma.client.findUnique({
            where: { email },
          });
          if (!existing) {
            await this.handlePendingRegistration({
              companyId: data.companyId,
              companyName: data.companyName || "Nova Empresa CTRL-Farm",
              adminName: data.adminName || "Administrador",
              adminEmail: email,
              phone: data.phone || undefined,
              requestedAt: data.createdAt || data.requestedAt,
            });
          }
        }
      }
    } catch {
      // Falha silenciosa no sync offline do Firestore
    }

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

  async handlePendingRegistration(dto: PendingRegistrationDto) {
    const email = dto.adminEmail.trim().toLowerCase();
    const existing = await this.prisma.client.findUnique({
      where: { email },
    });

    if (existing) {
      return existing;
    }

    const client = await this.prisma.client.create({
      data: {
        name: dto.companyName.trim(),
        tradeName: dto.companyName.trim(),
        contactPerson: dto.adminName.trim(),
        email,
        phone: dto.phone?.trim() || null,
        status: "PENDING",
        notes: `Solicitação de cadastro originada do CTRL-Farm (Empresa: ${dto.companyId || "N/A"}). Aguardando aprovação e geração de chave de ativação.`,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "CLIENT_PENDING_REGISTRATION_RECEIVED",
        performedBy: "Sistema CTRL-Farm",
        clientId: client.id,
        targetType: "CLIENT",
        targetId: client.id,
        details: { companyName: dto.companyName, email, companyId: dto.companyId },
      },
    });

    return client;
  }

  async approveRegistration(
    clientId: string,
    dto: ApproveRegistrationDto,
    adminUsername?: string,
  ) {
    const client = await this.findOne(clientId);

    // 1. Atualiza status do cliente para ACTIVE
    const updatedClient = await this.prisma.client.update({
      where: { id: clientId },
      data: { status: "ACTIVE" },
    });

    // 2. Busca o plano desejado
    const targetCode = dto.planCode || "STARTER";
    let plan = await this.prisma.plan.findUnique({
      where: { code: targetCode },
    });
    if (!plan) {
      plan = await this.prisma.plan.findFirst({
        where: { active: true },
      });
      if (!plan) {
        throw new NotFoundException("Nenhum plano ativo encontrado para emissão da chave.");
      }
    }

    // 3. Emite a licença e assinatura (Gera chave RSA e publica no Firebase)
    const license = await this.licensesService.generate(
      {
        clientId: client.id,
        planId: plan.id,
        billingCycle: dto.billingCycle || "MONTHLY",
        paymentMethod: "PIX",
      },
      adminUsername || "Administrador",
    );

    // 4. Dispara e-mail de confirmação para o cliente cadastrado com a chave de ativação
    if (dto.sendEmail !== false) {
      await this.emailService.sendActivationKeyEmail({
        to: client.email,
        clientName: client.contactPerson || client.name,
        companyName: client.name,
        activationKey: license.activationKey,
        planName: plan.name,
        expiresAt: license.expiresAt,
      });
    }

    // 5. Atualiza registro pendente no Firebase Firestore para liberar instantaneamente o CTRL-Farm
    try {
      const firestore = this.firebaseService.getFirestore();
      if (firestore) {
        await firestore.collection("pending_registrations").doc(client.email).set(
          {
            status: "APPROVED",
            activationKey: license.activationKey,
            planCode: plan.code,
            approvedAt: new Date().toISOString(),
          },
          { merge: true },
        );

        const match = (client.notes || "").match(/Empresa:\s*([a-zA-Z0-9_-]+)/);
        if (match && match[1] && match[1] !== "N/A") {
          await firestore.collection("pending_registrations").doc(match[1]).set(
            {
              status: "APPROVED",
              activationKey: license.activationKey,
              planCode: plan.code,
              approvedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }
      }
    } catch (e) {
      // ignore
    }

    // 6. Notifica diretamente a API do CTRL-Farm se estiver online
    await this.ctrlFarmNotifier.notifyLicenseActivation(
      license.activationKey,
      new Date(license.expiresAt).toISOString(),
      `Cadastro de ${client.name} aprovado pelo administrador ${adminUsername || ""}`,
    );

    await this.prisma.auditLog.create({
      data: {
        action: "CLIENT_REGISTRATION_APPROVED",
        performedBy: adminUsername || "Administrador",
        clientId: client.id,
        targetType: "CLIENT",
        targetId: client.id,
        details: {
          activationKey: license.activationKey,
          plan: plan.name,
          email: client.email,
        },
      },
    });

    return {
      success: true,
      message: `Cadastro de "${client.name}" aprovado com sucesso! Chave de ativação gerada e enviada por e-mail.`,
      activationKey: license.activationKey,
      client: updatedClient,
      license,
      plan,
    };
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
