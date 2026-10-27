import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { RsaService, buildLicenseCanonicalPayload } from "../crypto/rsa.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { CtrlFarmNotifierService } from "../integrations/ctrlfarm-notifier.service.js";
import { FirebaseLicenseSyncService } from "../firebase/firebase-license-sync.service.js";
import {
  ActivateLicenseDto,
  GenerateLicenseDto,
  RevokeLicenseDto,
  ValidateLicenseDto,
} from "./dto/generate-license.dto.js";

@Injectable()
export class LicensesService {
  private readonly logger = new Logger(LicensesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rsa: RsaService,
    private readonly ctrlFarmNotifier: CtrlFarmNotifierService,
    private readonly firebaseLicenseSync: FirebaseLicenseSyncService,
  ) {}

  async generate(dto: GenerateLicenseDto, adminUsername?: string) {
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException(`Cliente ${dto.clientId} não encontrado.`);

    let plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      plan = await this.prisma.plan.findUnique({ where: { code: dto.planId.toUpperCase() } });
    }
    if (!plan) throw new NotFoundException(`Plano ${dto.planId} não encontrado.`);

    // Regra Obrigatória: A licença deve estar vinculada a um cliente e a uma assinatura ativa com ciclo de pagamento
    let subscription: any = null;

    if (dto.subscriptionId) {
      subscription = await this.prisma.subscription.findUnique({
        where: { id: dto.subscriptionId },
        include: { plan: true },
      });
      if (!subscription) {
        throw new NotFoundException(`Assinatura ${dto.subscriptionId} não encontrada.`);
      }
      if (subscription.clientId !== client.id) {
        throw new BadRequestException(`A assinatura indicada pertence a outro cliente.`);
      }
      if (subscription.status === "CANCELADO") {
        throw new BadRequestException(`A assinatura indicada está cancelada.`);
      }
    } else {
      // Busca se o cliente já possui assinatura ativa para este plano
      subscription = await this.prisma.subscription.findFirst({
        where: {
          clientId: client.id,
          planId: plan.id,
          status: "ATIVO",
        },
        orderBy: { createdAt: "desc" },
      });

      // Se não possui, gera obrigatoriamente a assinatura vinculada com plano e ciclo
      if (!subscription) {
        const cycle = dto.billingCycle || "MONTHLY";
        const method = dto.paymentMethod || "PIX";
        const startDate = new Date();
        const nextBilling = new Date(startDate);

        let price = dto.customPrice !== undefined ? dto.customPrice : Number(plan.monthlyPrice);
        if (cycle === "QUARTERLY") {
          nextBilling.setMonth(nextBilling.getMonth() + 3);
          if (dto.customPrice === undefined && plan.quarterlyPrice) price = Number(plan.quarterlyPrice);
        } else if (cycle === "ANNUAL") {
          nextBilling.setFullYear(nextBilling.getFullYear() + 1);
          if (dto.customPrice === undefined && plan.annualPrice) price = Number(plan.annualPrice);
        } else if (plan.code === "TRIAL") {
          nextBilling.setDate(nextBilling.getDate() + 7);
          price = 0;
        } else if (plan.code === "UNLIMITED_OWNER") {
          nextBilling.setFullYear(nextBilling.getFullYear() + 10);
          price = 0;
        } else {
          nextBilling.setMonth(nextBilling.getMonth() + 1);
        }

        subscription = await this.prisma.subscription.create({
          data: {
            clientId: client.id,
            planId: plan.id,
            billingCycle: cycle as any,
            status: "ATIVO",
            currentPrice: price,
            startDate,
            nextBillingDate: nextBilling,
            paymentMethod: method,
            autoRenew: true,
            paymentHistory: [
              {
                date: startDate.toISOString(),
                amount: price,
                method,
                status: "PAID",
                note: "Primeiro pagamento gerado na emissão da licença.",
              },
            ],
          },
        });

        await this.prisma.auditLog.create({
          data: {
            action: "SUBSCRIPTION_CREATED",
            performedBy: adminUsername || "Administrador",
            clientId: client.id,
            targetType: "SUBSCRIPTION",
            targetId: subscription.id,
            details: {
              reason: "Assinatura vinculada gerada automaticamente para nova licença",
              planCode: plan.code,
              cycle,
              price,
            },
          },
        });
      }
    }

    // Calcula validade alinhada ao ciclo da assinatura
    const issuedAt = new Date();
    let expiresAt: Date;

    if (dto.expiresAt) {
      expiresAt = new Date(dto.expiresAt);
    } else if (subscription?.nextBillingDate) {
      expiresAt = new Date(subscription.nextBillingDate);
    } else if (plan.code === "TRIAL") {
      expiresAt = new Date(issuedAt);
      expiresAt.setDate(expiresAt.getDate() + 7);
    } else if (plan.code === "UNLIMITED_OWNER") {
      expiresAt = new Date(issuedAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + 10);
    } else {
      const days = dto.validityDays ?? 365;
      expiresAt = new Date(issuedAt);
      expiresAt.setDate(expiresAt.getDate() + days);
    }

    const activationKey = this.rsa.generateActivationKey();

    // Features combinadas
    const planFeatures = (plan.features as Record<string, any>) || {};
    const features = {
      ...planFeatures,
      ...(dto.customFeatures || {}),
      planCode: plan.code,
      maxUsers: plan.maxUsers,
      maxPrinters: plan.maxPrinters,
      maxCompanies: plan.maxCompanies,
    };

    const canonicalPayload = buildLicenseCanonicalPayload({
      activationKey,
      clientId: client.id,
      clientName: client.name,
      planCode: plan.code,
      issuedAt: issuedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      features,
    });

    const rsaSignature = this.rsa.signLicensePayload(canonicalPayload);

    const license = await this.prisma.license.create({
      data: {
        activationKey,
        clientId: client.id,
        planId: plan.id,
        subscriptionId: subscription.id,
        status: "ACTIVE",
        issuedAt,
        expiresAt,
        allowedFeatures: features,
        rsaSignature,
      },
      include: {
        client: true,
        plan: true,
        subscription: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "KEY_GENERATED",
        performedBy: adminUsername || "Administrador",
        clientId: client.id,
        targetType: "LICENSE",
        targetId: license.id,
        details: {
          activationKey,
          planCode: plan.code,
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    this.logger.log(`Licença ${activationKey} gerada com sucesso para cliente ${client.name} (${plan.name}).`);

    // Sincroniza licença com Firebase Firestore para validação em nuvem
    await this.firebaseLicenseSync.publishLicense({
      id: license.id,
      key: activationKey,
      clientId: client.id,
      clientName: client.name,
      clientEmail: client.email,
      planCode: plan.code,
      planName: plan.name,
      status: license.status,
      expiresAt: expiresAt,
      maxPrinters: plan.maxPrinters,
      maxCompanies: plan.maxCompanies,
      allowedFeatures: license.allowedFeatures,
      subscriptionId: subscription.id,
      action: "CREATE",
    });

    return {
      ...license,
      payload: canonicalPayload,
      publicKey: this.rsa.getPublicKey(),
    };
  }

  async findAll(query?: { clientId?: string; status?: string; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.clientId) where.clientId = query.clientId;
    if (query?.status) where.status = query.status;
    if (query?.search) {
      const q = query.search.trim();
      where.OR = [
        { activationKey: { contains: q, mode: "insensitive" } },
        { client: { name: { contains: q, mode: "insensitive" } } },
        { client: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.license.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          client: {
            select: { id: true, name: true, tradeName: true, email: true, document: true },
          },
          plan: {
            select: { id: true, code: true, name: true, monthlyPrice: true },
          },
          _count: {
            select: { validationLogs: true },
          },
        },
      }),
      this.prisma.license.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const license = await this.prisma.license.findUnique({
      where: { id },
      include: {
        client: true,
        plan: true,
        subscription: true,
        validationLogs: {
          orderBy: { validatedAt: "desc" },
          take: 20,
        },
      },
    });

    if (!license) {
      throw new NotFoundException(`Licença ${id} não encontrada.`);
    }

    return license;
  }

  async revoke(id: string, dto: RevokeLicenseDto, adminUsername?: string) {
    const license = await this.findOne(id);

    const updated = await this.prisma.license.update({
      where: { id },
      data: { status: "REVOKED" },
    });

    // Notificação IMEDIATA para CTRL-Farm travar o serviço (HTTP + Firebase)
    await Promise.allSettled([
      this.ctrlFarmNotifier.notifyLicenseSuspension(
        license.activationKey,
        dto.reason || "Licença revogada pelo administrador.",
      ),
      this.firebaseLicenseSync.publishRevocation(
        license.activationKey,
        dto.reason || "Licença revogada pelo administrador.",
      ),
    ]);

    await this.prisma.auditLog.create({
      data: {
        action: "LICENSE_REVOKED",
        performedBy: adminUsername || "Administrador",
        clientId: license.clientId,
        targetType: "LICENSE",
        targetId: license.id,
        details: { reason: dto.reason, activationKey: license.activationKey },
      },
    });

    return updated;
  }

  async update(
    id: string,
    dto: { expiresAt?: string; offlineGracePeriodDays?: number; features?: any },
    adminUsername?: string,
  ) {
    const license = await this.findOne(id);

    const newExpiresAt = dto.expiresAt ? new Date(dto.expiresAt) : license.expiresAt;
    const newGraceDays = dto.offlineGracePeriodDays ?? license.offlineGracePeriodDays;
    const newFeatures = dto.features
      ? { ...(license.allowedFeatures as any), ...dto.features }
      : license.allowedFeatures;

    const canonicalPayload = buildLicenseCanonicalPayload({
      activationKey: license.activationKey,
      clientId: license.client.id,
      clientName: license.client.name,
      planCode: license.plan.code,
      issuedAt: license.issuedAt.toISOString(),
      expiresAt: newExpiresAt.toISOString(),
      features: newFeatures,
    });

    const newSignature = this.rsa.signLicensePayload(canonicalPayload);

    const updated = await this.prisma.license.update({
      where: { id },
      data: {
        expiresAt: newExpiresAt,
        offlineGracePeriodDays: newGraceDays,
        allowedFeatures: newFeatures,
        rsaSignature: newSignature,
      },
      include: { client: true, plan: true },
    });

    // Sincroniza atualização de plano / features / validade no Firebase Firestore
    await this.firebaseLicenseSync.publishLicense({
      id: updated.id,
      key: updated.activationKey,
      clientId: updated.clientId,
      clientName: updated.client?.name,
      clientEmail: updated.client?.email,
      planCode: updated.plan.code,
      planName: updated.plan.name,
      status: updated.status,
      expiresAt: updated.expiresAt,
      maxPrinters: updated.plan.maxPrinters,
      maxCompanies: updated.plan.maxCompanies,
      allowedFeatures: updated.allowedFeatures,
      action: "UPDATE",
    });

    await this.prisma.auditLog.create({
      data: {
        action: "LICENSE_UPDATED",
        performedBy: adminUsername || "Administrador",
        clientId: license.clientId,
        targetType: "LICENSE",
        targetId: id,
        details: { activationKey: license.activationKey, updatedFields: Object.keys(dto) },
      },
    });

    return updated;
  }

  async changeStatus(id: string, status: string, adminUsername?: string) {
    const license = await this.findOne(id);
    const updated = await this.prisma.license.update({
      where: { id },
      data: { status: status as any },
      include: { client: true, plan: true },
    });

    if (status === "PAUSED") {
      await Promise.allSettled([
        this.ctrlFarmNotifier.notifyLicenseSuspension(
          license.activationKey,
          `Licença pausada pelo administrador.`,
        ),
        this.firebaseLicenseSync.publishPause(
          license.activationKey,
          `Licença pausada pelo administrador.`,
        ),
      ]);
    } else if (status === "SUSPENDED") {
      await Promise.allSettled([
        this.ctrlFarmNotifier.notifyLicenseSuspension(
          license.activationKey,
          `Licença suspensa pelo administrador.`,
        ),
        this.firebaseLicenseSync.publishSuspension(
          license.activationKey,
          `Licença suspensa pelo administrador.`,
        ),
      ]);
    } else if (status === "REVOKED") {
      await Promise.allSettled([
        this.ctrlFarmNotifier.notifyLicenseSuspension(
          license.activationKey,
          `Licença revogada pelo administrador.`,
        ),
        this.firebaseLicenseSync.publishRevocation(
          license.activationKey,
          `Licença revogada pelo administrador.`,
        ),
      ]);
    } else if (status === "ACTIVE") {
      // REATIVAÇÃO IMEDIATA: Notifica CTRL-Farm (HTTP + Firebase Firestore)
      await Promise.allSettled([
        this.ctrlFarmNotifier.notifyLicenseActivation(
          license.activationKey,
          license.expiresAt.toISOString(),
        ),
        this.firebaseLicenseSync.publishLicense({
          id: license.id,
          key: license.activationKey,
          clientId: license.clientId,
          clientName: license.client?.name,
          clientEmail: license.client?.email,
          planCode: license.plan.code,
          planName: license.plan.name,
          status: "ACTIVE",
          expiresAt: license.expiresAt,
          maxPrinters: license.plan.maxPrinters,
          maxCompanies: license.plan.maxCompanies,
          allowedFeatures: license.allowedFeatures,
          action: "ACTIVATE",
        }),
      ]);
    }

    await this.prisma.auditLog.create({
      data: {
        action: `LICENSE_${status}`,
        performedBy: adminUsername || "Administrador",
        clientId: license.clientId,
        targetType: "LICENSE",
        targetId: id,
        details: {
          activationKey: license.activationKey,
          previousStatus: license.status,
          newStatus: status,
        },
      },
    });

    return updated;
  }

  async delete(id: string, adminUsername?: string) {
    const license = await this.findOne(id);

    await this.prisma.licenseValidationLog.deleteMany({
      where: { licenseId: id },
    });
    await this.prisma.license.delete({
      where: { id },
    });

    // Remove ou desativa chave no Firebase Firestore
    await this.firebaseLicenseSync.deleteLicenseDoc(license.activationKey);

    await this.prisma.auditLog.create({
      data: {
        action: "LICENSE_DELETED",
        performedBy: adminUsername || "Administrador",
        clientId: license.clientId,
        targetType: "LICENSE",
        targetId: id,
        details: { activationKey: license.activationKey },
      },
    });

    return { success: true, message: `Licença ${license.activationKey} excluída com sucesso.` };
  }

  /**
   * Ativação da chave inserida no CTRL-Farm (M2M)
   */
  async activate(dto: ActivateLicenseDto, clientIp?: string) {
    const cleanKey = dto.activationKey.trim().toUpperCase();
    const license = await this.prisma.license.findUnique({
      where: { activationKey: cleanKey },
      include: { client: true, plan: true, subscription: true },
    });

    if (!license) {
      throw new NotFoundException("Chave de ativação inválida ou não encontrada.");
    }

    if (
      license.status === "SUSPENDED" ||
      license.subscription?.status === "SUSPENSO"
    ) {
      throw new BadRequestException("Assinatura suspensa por pagamento pendente.");
    }

    if (license.status === "REVOKED") {
      throw new BadRequestException("Esta licença foi revogada pelo administrador.");
    }

    if (new Date() > new Date(license.expiresAt)) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: "EXPIRED" },
      });
      throw new BadRequestException("Esta licença expirou.");
    }

    // Registra hardware fingerprint e IP
    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: {
        status: "ACTIVE",
        hardwareFingerprint: dto.hardwareFingerprint || license.hardwareFingerprint,
        clientIp: clientIp || license.clientIp,
        lastValidatedAt: new Date(),
      },
      include: { client: true, plan: true },
    });

    // Registra log de validação
    await this.prisma.licenseValidationLog.create({
      data: {
        licenseId: license.id,
        instanceId: dto.instanceId || null,
        ipAddress: clientIp || "127.0.0.1",
        clientVersion: dto.clientVersion || null,
        isOnline: true,
        status: "OK",
        details: { action: "ACTIVATION", hardware: dto.hardwareFingerprint },
      },
    });

    // Registra auditoria
    await this.prisma.auditLog.create({
      data: {
        action: "LICENSE_ACTIVATED",
        performedBy: license.client.name,
        clientId: license.clientId,
        targetType: "LICENSE",
        targetId: license.id,
        ipAddress: clientIp,
        details: {
          activationKey: license.activationKey,
          version: dto.clientVersion,
          hardware: dto.hardwareFingerprint,
        },
      },
    });

    return {
      valid: true,
      status: "ACTIVE",
      activationKey: updated.activationKey,
      clientId: updated.client.id,
      clientName: updated.client.name,
      planCode: updated.plan.code,
      client: {
        id: updated.client.id,
        name: updated.client.name,
        email: updated.client.email,
        document: updated.client.document,
      },
      plan: {
        code: updated.plan.code,
        name: updated.plan.name,
        maxUsers: updated.plan.maxUsers,
        maxPrinters: updated.plan.maxPrinters,
        maxCompanies: updated.plan.maxCompanies,
      },
      features: updated.allowedFeatures,
      issuedAt: updated.issuedAt.toISOString(),
      expiresAt: updated.expiresAt.toISOString(),
      rsaSignature: updated.rsaSignature,
      publicKey: this.rsa.getPublicKey(),
    };
  }

  /**
   * Validação Online periódica para o CTRL-Farm (M2M)
   */
  async validateOnline(dto: ValidateLicenseDto, clientIp?: string) {
    const cleanKey = dto.activationKey.trim().toUpperCase();
    const license = await this.prisma.license.findUnique({
      where: { activationKey: cleanKey },
      include: { client: true, plan: true, subscription: true },
    });

    if (!license) {
      return { valid: false, status: "INVALID", message: "Licença inexistente." };
    }

    // Checagem de Suspensão / Pausa / Cancelamento / Revogação
    const isPaused =
      license.status === "PAUSED" ||
      license.subscription?.status === "PAUSADO";

    const isCancelled =
      license.subscription?.status === "CANCELADO";

    const isRevoked =
      license.status === "REVOKED";

    const isSuspended =
      license.status === "SUSPENDED" ||
      license.subscription?.status === "SUSPENSO" ||
      (license.subscription &&
        license.subscription.status !== "CANCELADO" &&
        license.plan.code !== "UNLIMITED_OWNER" &&
        license.plan.code !== "TRIAL" &&
        new Date() > new Date(license.subscription.nextBillingDate));

    if (isSuspended || isPaused || isCancelled || isRevoked) {
      const lockType = isSuspended
        ? "SUSPENDED"
        : isPaused
          ? "PAUSED"
          : isCancelled
            ? "CANCELLED"
            : "REVOKED";

      const message = isSuspended
        ? "Assinatura suspensa por pagamento pendente."
        : isPaused
          ? "Licença pausada temporariamente pelo administrador."
          : isCancelled
            ? "Assinatura cancelada no Sistema ADM."
            : "Chave de licença revogada pelo administrador.";

      return {
        valid: false,
        status: lockType,
        message,
        isSuspended: true,
        isLocked: true,
      };
    }

    if (license.status === "REVOKED") {
      await this.prisma.licenseValidationLog.create({
        data: {
          licenseId: license.id,
          instanceId: dto.instanceId || null,
          ipAddress: clientIp || "127.0.0.1",
          clientVersion: dto.clientVersion || null,
          isOnline: true,
          status: "REVOKED",
        },
      });
      return { valid: false, status: "REVOKED", message: "Licença revogada." };
    }

    const isExpired = new Date() > new Date(license.expiresAt);
    if (isExpired) {
      await this.prisma.license.update({
        where: { id: license.id },
        data: { status: "EXPIRED" },
      });
      await this.prisma.licenseValidationLog.create({
        data: {
          licenseId: license.id,
          instanceId: dto.instanceId || null,
          ipAddress: clientIp || "127.0.0.1",
          clientVersion: dto.clientVersion || null,
          isOnline: true,
          status: "EXPIRED",
        },
      });
      return { valid: false, status: "EXPIRED", message: "Licença expirada." };
    }

    await this.prisma.license.update({
      where: { id: license.id },
      data: { lastValidatedAt: new Date(), clientIp: clientIp || license.clientIp },
    });

    await this.prisma.licenseValidationLog.create({
      data: {
        licenseId: license.id,
        instanceId: dto.instanceId || null,
        ipAddress: clientIp || "127.0.0.1",
        clientVersion: dto.clientVersion || null,
        isOnline: true,
        status: "OK",
      },
    });

    return {
      valid: true,
      status: "ACTIVE",
      activationKey: license.activationKey,
      clientId: license.client.id,
      clientName: license.client.name,
      planCode: license.plan.code,
      client: {
        id: license.client.id,
        name: license.client.name,
        email: license.client.email,
        document: license.client.document,
      },
      plan: {
        code: license.plan.code,
        name: license.plan.name,
        maxUsers: license.plan.maxUsers,
        maxPrinters: license.plan.maxPrinters,
        maxCompanies: license.plan.maxCompanies,
      },
      features: license.allowedFeatures,
      issuedAt: license.issuedAt.toISOString(),
      expiresAt: license.expiresAt.toISOString(),
      rsaSignature: license.rsaSignature,
      publicKey: this.rsa.getPublicKey(),
    };
  }

  getPublicKey() {
    return {
      algorithm: "RSA-SHA256",
      keyLength: 4096,
      publicKeyPem: this.rsa.getPublicKey(),
    };
  }

  /**
   * Consulta o status da assinatura e se há suspensão por pagamento pendente
   */
  async checkSubscriptionStatus(activationKey: string) {
    const cleanKey = activationKey.trim().toUpperCase();
    const license = await this.prisma.license.findUnique({
      where: { activationKey: cleanKey },
      include: { subscription: true, plan: true, client: true },
    });

    if (!license) {
      return { found: false, status: "NOT_FOUND", isSuspended: false, isLocked: false };
    }

    const isSuspended =
      license.status === "SUSPENDED" ||
      license.subscription?.status === "SUSPENSO" ||
      (license.subscription &&
        license.subscription.status !== "CANCELADO" &&
        license.plan.code !== "UNLIMITED_OWNER" &&
        license.plan.code !== "TRIAL" &&
        new Date() > new Date(license.subscription.nextBillingDate));

    const isPaused =
      license.status === "PAUSED" ||
      license.subscription?.status === "PAUSADO";

    const isCancelled =
      license.subscription?.status === "CANCELADO";

    const isRevoked =
      license.status === "REVOKED";

    const isLocked = isSuspended || isPaused || isCancelled || isRevoked;

    let lockType = null;
    let lockReason = "";
    if (isSuspended) {
      lockType = "SUSPENDED";
      lockReason = "Assinatura suspensa por pagamento pendente.";
    } else if (isPaused) {
      lockType = "PAUSED";
      lockReason = "Licença pausada temporariamente pelo administrador.";
    } else if (isCancelled) {
      lockType = "CANCELLED";
      lockReason = "Assinatura cancelada no Sistema ADM.";
    } else if (isRevoked) {
      lockType = "REVOKED";
      lockReason = "Chave de licença revogada pelo administrador.";
    }

    return {
      found: true,
      activationKey: license.activationKey,
      licenseStatus: lockType || license.status,
      subscriptionStatus: license.subscription
        ? isSuspended
          ? "SUSPENSO"
          : isPaused
            ? "PAUSADO"
            : isCancelled
              ? "CANCELADO"
              : license.subscription.status
        : "SEM_ASSINATURA",
      isSuspended: isLocked, // Para compatibilidade com checagens existentes
      isLocked,
      lockType,
      lockReason,
      nextBillingDate: license.subscription?.nextBillingDate || license.expiresAt,
      planName: license.plan.name,
      planCode: license.plan.code,
    };
  }
}
