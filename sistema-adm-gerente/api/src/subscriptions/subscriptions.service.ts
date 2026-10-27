import { Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { CtrlFarmNotifierService } from "../integrations/ctrlfarm-notifier.service.js";
import { FirebaseLicenseSyncService } from "../firebase/firebase-license-sync.service.js";
import {
  BillingCycleEnum,
  CreateSubscriptionDto,
  SubscriptionStatusEnum,
  UpdateSubscriptionDto,
} from "./dto/create-subscription.dto.js";

@Injectable()
export class SubscriptionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionsService.name);
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ctrlFarmNotifier: CtrlFarmNotifierService,
    private readonly firebaseLicenseSync: FirebaseLicenseSyncService,
  ) {}

  onModuleInit() {
    // Checagem imediata 4 segundos após inicialização do Sistema ADM
    setTimeout(() => {
      this.checkAllSubscriptionsAndLicenses("Startup do Sistema ADM Gerente")
        .catch((err) => this.logger.warn(`Falha na checagem inicial de assinaturas: ${err.message}`));
    }, 4000);

    // Agendador de rotina a cada 1 hora
    this.checkInterval = setInterval(() => {
      this.checkAllSubscriptionsAndLicenses("Agendador Automático ADM")
        .catch((err) => this.logger.warn(`Falha na checagem periódica de assinaturas: ${err.message}`));
    }, 60 * 60 * 1000);

    this.logger.log("Rotina de checagem de pagamentos e sincronização Firebase ativada.");
  }

  onModuleDestroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async findAll(query?: { clientId?: string; status?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query?.page ?? 1);
    const limit = Math.min(100, Math.max(1, query?.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.clientId) where.clientId = query.clientId;
    if (query?.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          client: {
            select: { id: true, name: true, tradeName: true, email: true, document: true },
          },
          plan: true,
          licenses: {
            select: { id: true, activationKey: true, status: true, expiresAt: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        client: true,
        plan: true,
        licenses: true,
      },
    });

    if (!sub) {
      throw new NotFoundException(`Assinatura ${id} não encontrada.`);
    }

    return sub;
  }

  async create(dto: CreateSubscriptionDto, adminUsername?: string) {
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException(`Cliente ${dto.clientId} não encontrado.`);

    // Busca o plano por id ou por code
    let plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan) {
      plan = await this.prisma.plan.findUnique({ where: { code: dto.planId.toUpperCase() } });
    }
    if (!plan) throw new NotFoundException(`Plano ${dto.planId} não encontrado.`);

    // Calcula valor e próxima data de cobrança
    let price = dto.customPrice !== undefined ? dto.customPrice : Number(plan.monthlyPrice);
    const startDate = new Date();
    const nextBilling = new Date(startDate);

    if (dto.billingCycle === BillingCycleEnum.QUARTERLY) {
      nextBilling.setMonth(nextBilling.getMonth() + 3);
      if (dto.customPrice === undefined && plan.quarterlyPrice) {
        price = Number(plan.quarterlyPrice);
      }
    } else if (dto.billingCycle === BillingCycleEnum.ANNUAL) {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      if (dto.customPrice === undefined && plan.annualPrice) {
        price = Number(plan.annualPrice);
      }
    } else {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
    }

    const subscription = await this.prisma.subscription.create({
      data: {
        clientId: client.id,
        planId: plan.id,
        billingCycle: dto.billingCycle as any,
        status: SubscriptionStatusEnum.ATIVO as any,
        currentPrice: price,
        startDate,
        nextBillingDate: nextBilling,
        paymentMethod: dto.paymentMethod || "PIX",
        autoRenew: true,
        paymentHistory: [
          {
            date: startDate.toISOString(),
            amount: price,
            method: dto.paymentMethod || "PIX",
            status: "PAID",
            note: "Primeiro pagamento na ativação do plano.",
          },
        ],
      },
      include: {
        client: true,
        plan: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "SUBSCRIPTION_CREATED",
        performedBy: adminUsername || "Administrador",
        clientId: client.id,
        targetType: "SUBSCRIPTION",
        targetId: subscription.id,
        details: { planCode: plan.code, billingCycle: dto.billingCycle, price },
      },
    });

    // Sincroniza nova assinatura com Firebase Firestore
    await this.firebaseLicenseSync.publishSubscription({
      id: subscription.id,
      clientId: subscription.clientId,
      clientName: client.name,
      planId: plan.id,
      planCode: plan.code,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      nextBillingDate: subscription.nextBillingDate,
      paymentStatus: "PAID",
    });

    return subscription;
  }

  async update(id: string, dto: UpdateSubscriptionDto, adminUsername?: string) {
    const existing = await this.findOne(id);

    const subscription = await this.prisma.subscription.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status as any } : {}),
        ...(dto.billingCycle ? { billingCycle: dto.billingCycle as any } : {}),
        ...(dto.currentPrice !== undefined ? { currentPrice: dto.currentPrice } : {}),
        ...(dto.paymentMethod ? { paymentMethod: dto.paymentMethod } : {}),
        ...(dto.status === SubscriptionStatusEnum.CANCELADO ? { cancelledAt: new Date() } : {}),
      },
      include: { licenses: true, client: true, plan: true },
    });

    // Sincroniza atualização da assinatura com Firebase
    await this.firebaseLicenseSync.publishSubscription({
      id: subscription.id,
      clientId: subscription.clientId,
      clientName: subscription.client?.name,
      planId: subscription.planId,
      planCode: subscription.plan?.code,
      status: subscription.status,
      billingCycle: subscription.billingCycle,
      nextBillingDate: subscription.nextBillingDate,
      paymentStatus: subscription.status === "ATIVO" ? "PAID" : "PENDING",
    });

    if (dto.status === "SUSPENSO" || (dto.status as any) === SubscriptionStatusEnum.SUSPENSO) {
      await this.prisma.license.updateMany({
        where: { subscriptionId: id },
        data: { status: "SUSPENDED" },
      });
      for (const lic of subscription.licenses) {
        await Promise.allSettled([
          this.ctrlFarmNotifier.notifyLicenseSuspension(
            lic.activationKey,
            "Assinatura suspensa pelo administrador no ADM Gerente.",
          ),
          this.firebaseLicenseSync.publishSuspension(
            lic.activationKey,
            "Assinatura suspensa pelo administrador no ADM Gerente.",
          ),
        ]);
      }
    } else if (dto.status === "ATIVO" || (dto.status as any) === SubscriptionStatusEnum.ATIVO) {
      await this.prisma.license.updateMany({
        where: { subscriptionId: id },
        data: { status: "ACTIVE" },
      });
      for (const lic of subscription.licenses) {
        await Promise.allSettled([
          this.ctrlFarmNotifier.notifyLicenseActivation(lic.activationKey, lic.expiresAt.toISOString()),
          this.firebaseLicenseSync.publishLicense({
            id: lic.id,
            key: lic.activationKey,
            clientId: subscription.clientId,
            clientName: subscription.client?.name,
            planCode: subscription.plan?.code || "PRO",
            status: "ACTIVE",
            expiresAt: lic.expiresAt,
            allowedFeatures: lic.allowedFeatures,
            action: "ACTIVATE",
          }),
        ]);
      }
    } else if (dto.status === "PAUSADO" || (dto.status as any) === SubscriptionStatusEnum.PAUSADO) {
      await this.prisma.license.updateMany({
        where: { subscriptionId: id },
        data: { status: "PAUSED" },
      });
      for (const lic of subscription.licenses) {
        await Promise.allSettled([
          this.ctrlFarmNotifier.notifyLicenseSuspension(lic.activationKey, "Assinatura pausada pelo administrador."),
          this.firebaseLicenseSync.publishPause(lic.activationKey, "Assinatura pausada pelo administrador."),
        ]);
      }
    } else if (dto.status === "CANCELADO" || (dto.status as any) === SubscriptionStatusEnum.CANCELADO) {
      await this.prisma.license.updateMany({
        where: { subscriptionId: id },
        data: { status: "REVOKED" },
      });
      for (const lic of subscription.licenses) {
        await Promise.allSettled([
          this.ctrlFarmNotifier.notifyLicenseSuspension(lic.activationKey, "Assinatura cancelada pelo administrador."),
          this.firebaseLicenseSync.publishRevocation(lic.activationKey, "Assinatura cancelada pelo administrador."),
        ]);
      }
    }

    await this.prisma.auditLog.create({
      data: {
        action: "SUBSCRIPTION_UPDATED",
        performedBy: adminUsername || "Administrador",
        clientId: existing.clientId,
        targetType: "SUBSCRIPTION",
        targetId: subscription.id,
        details: { updatedFields: Object.keys(dto) },
      },
    });

    return subscription;
  }

  async renew(id: string, adminUsername?: string) {
    const sub = await this.findOne(id);

    const currentNext = new Date(sub.nextBillingDate);
    if (sub.billingCycle === "ANNUAL") {
      currentNext.setFullYear(currentNext.getFullYear() + 1);
    } else if (sub.billingCycle === "QUARTERLY") {
      currentNext.setMonth(currentNext.getMonth() + 3);
    } else {
      currentNext.setMonth(currentNext.getMonth() + 1);
    }

    const history = Array.isArray(sub.paymentHistory) ? [...sub.paymentHistory] : [];
    history.push({
      date: new Date().toISOString(),
      amount: Number(sub.currentPrice),
      method: sub.paymentMethod || "PIX",
      status: "PAID",
      note: "Renovação periódica efetuada.",
    });

    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: "ATIVO",
        nextBillingDate: currentNext,
        paymentHistory: history,
      },
      include: { client: true, plan: true, licenses: true },
    });

    // Atualiza licenças vinculadas com nova data de validade no PostgreSQL e no Firebase
    for (const lic of sub.licenses) {
      await this.prisma.license.update({
        where: { id: lic.id },
        data: {
          status: "ACTIVE",
          expiresAt: currentNext,
        },
      });
      await this.firebaseLicenseSync.publishLicense({
        id: lic.id,
        key: lic.activationKey,
        clientId: sub.clientId,
        clientName: sub.client?.name,
        planCode: sub.plan?.code || "PRO",
        planName: sub.plan?.name,
        status: "ACTIVE",
        expiresAt: currentNext,
        allowedFeatures: lic.allowedFeatures,
        action: "RENEW",
      });
      await this.ctrlFarmNotifier.notifyLicenseActivation(lic.activationKey, currentNext.toISOString());
    }

    // Sincroniza renovação da assinatura no Firebase Firestore
    await this.firebaseLicenseSync.publishSubscription({
      id: updated.id,
      clientId: updated.clientId,
      clientName: sub.client?.name,
      planId: updated.planId,
      planCode: sub.plan?.code,
      status: updated.status,
      billingCycle: updated.billingCycle,
      nextBillingDate: updated.nextBillingDate,
      lastPaymentDate: new Date(),
      paymentStatus: "PAID",
    });

    await this.prisma.auditLog.create({
      data: {
        action: "SUBSCRIPTION_RENEWED",
        performedBy: adminUsername || "Administrador",
        clientId: sub.clientId,
        targetType: "SUBSCRIPTION",
        targetId: sub.id,
        details: { newNextBillingDate: currentNext.toISOString() },
      },
    });

    return updated;
  }

  async changeStatus(id: string, status: string, adminUsername?: string) {
    const existing = await this.findOne(id);
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        status: status as any,
        ...(status === "CANCELADO" ? { cancelledAt: new Date() } : {}),
      },
      include: { licenses: true, client: true, plan: true },
    });

    if (status === "ATIVO") {
      await this.prisma.license.updateMany({
        where: { subscriptionId: id },
        data: { status: "ACTIVE" },
      });
      for (const lic of updated.licenses) {
        await Promise.allSettled([
          this.ctrlFarmNotifier.notifyLicenseActivation(lic.activationKey, lic.expiresAt.toISOString()),
          this.firebaseLicenseSync.publishLicense({
            id: lic.id,
            key: lic.activationKey,
            clientId: existing.clientId,
            clientName: existing.client?.name,
            planCode: existing.plan?.code || "PRO",
            status: "ACTIVE",
            expiresAt: lic.expiresAt,
            allowedFeatures: lic.allowedFeatures,
            action: "ACTIVATE",
          }),
        ]);
      }
    } else if (status === "SUSPENSO") {
      // SUSPENSÃO IMEDIATA: Suspende a chave de ativação e envia validação imediata ao CTRL-Farm
      await this.prisma.license.updateMany({
        where: { subscriptionId: id },
        data: { status: "SUSPENDED" },
      });
      for (const lic of updated.licenses) {
        await Promise.allSettled([
          this.ctrlFarmNotifier.notifyLicenseSuspension(
            lic.activationKey,
            "Assinatura suspensa pelo administrador no Sistema ADM Gerente.",
          ),
          this.firebaseLicenseSync.publishSuspension(
            lic.activationKey,
            "Assinatura suspensa pelo administrador no Sistema ADM Gerente.",
          ),
        ]);
      }
    } else if (status === "PAUSADO") {
      await this.prisma.license.updateMany({
        where: { subscriptionId: id },
        data: { status: "PAUSED" },
      });
      for (const lic of updated.licenses) {
        await Promise.allSettled([
          this.ctrlFarmNotifier.notifyLicenseSuspension(
            lic.activationKey,
            `Assinatura pausada no Sistema ADM Gerente.`,
          ),
          this.firebaseLicenseSync.publishPause(
            lic.activationKey,
            `Assinatura pausada no Sistema ADM Gerente.`,
          ),
        ]);
      }
    } else if (status === "CANCELADO") {
      await this.prisma.license.updateMany({
        where: { subscriptionId: id },
        data: { status: "REVOKED" },
      });
      for (const lic of updated.licenses) {
        await Promise.allSettled([
          this.ctrlFarmNotifier.notifyLicenseSuspension(
            lic.activationKey,
            `Assinatura cancelada no Sistema ADM Gerente.`,
          ),
          this.firebaseLicenseSync.publishRevocation(
            lic.activationKey,
            `Assinatura cancelada no Sistema ADM Gerente.`,
          ),
        ]);
      }
    }

    // Sincroniza status no Firebase Firestore
    await this.firebaseLicenseSync.publishSubscription({
      id: updated.id,
      clientId: updated.clientId,
      clientName: existing.client?.name,
      planId: updated.planId,
      planCode: existing.plan?.code,
      status: updated.status,
      billingCycle: updated.billingCycle,
      nextBillingDate: updated.nextBillingDate,
      paymentStatus: updated.status === "ATIVO" ? "PAID" : "PENDING",
    });

    await this.prisma.auditLog.create({
      data: {
        action: `SUBSCRIPTION_${status}`,
        performedBy: adminUsername || "Administrador",
        clientId: existing.clientId,
        targetType: "SUBSCRIPTION",
        targetId: id,
        details: { previousStatus: existing.status, newStatus: status },
      },
    });

    return updated;
  }

  async delete(id: string, adminUsername?: string) {
    const existing = await this.findOne(id);
    await this.prisma.license.updateMany({
      where: { subscriptionId: id },
      data: { subscriptionId: null },
    });
    await this.prisma.subscription.delete({
      where: { id },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "SUBSCRIPTION_DELETED",
        performedBy: adminUsername || "Administrador",
        clientId: existing.clientId,
        targetType: "SUBSCRIPTION",
        targetId: id,
        details: { planId: existing.planId, currentPrice: Number(existing.currentPrice) },
      },
    });

    return { success: true, message: "Assinatura removida com sucesso." };
  }

  /**
   * Processa todas as assinaturas com vencimento atingido (Rotina do Ciclo de Pagamento)
   * Se o pagamento for validado positivamente, renova o ciclo e a data de validade da licença RSA.
   * Se o pagamento estiver pendente/com erro, suspende a assinatura e trava as funcionalidades do CTRL-Farm.
   */
  async processDueSubscriptions(adminUsername?: string) {
    const now = new Date();
    const dueSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: { in: ["ATIVO", "SUSPENSO"] },
        nextBillingDate: { lte: now },
      },
      include: {
        client: true,
        plan: true,
        licenses: true,
      },
    });

    const results = {
      total: dueSubscriptions.length,
      renewed: 0,
      suspended: 0,
      details: [] as any[],
    };

    for (const sub of dueSubscriptions) {
      // Verifica se houve pagamento aprovado recente para este cliente/assinatura
      const recentPaidTransaction = await this.prisma.paymentTransaction.findFirst({
        where: {
          OR: [
            { subscriptionId: sub.id, status: "PAID" },
            { clientId: sub.clientId, status: "PAID" },
          ],
          createdAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30) }, // últimos 30 dias
        },
        orderBy: { createdAt: "desc" },
      });

      const isPaymentPositive =
        Boolean(recentPaidTransaction) ||
        sub.paymentMethod === "CORTESIA" ||
        sub.plan.code === "UNLIMITED_OWNER";

      if (isPaymentPositive) {
        // PAGAMENTO POSITIVO: Renova a assinatura e estende as licenças vinculadas com assinatura RSA
        const currentNext = new Date(sub.nextBillingDate);
        if (sub.billingCycle === "ANNUAL") {
          currentNext.setFullYear(currentNext.getFullYear() + 1);
        } else if (sub.billingCycle === "QUARTERLY") {
          currentNext.setMonth(currentNext.getMonth() + 3);
        } else {
          currentNext.setMonth(currentNext.getMonth() + 1);
        }

        const history = Array.isArray(sub.paymentHistory) ? [...sub.paymentHistory] : [];
        history.push({
          date: now.toISOString(),
          amount: Number(sub.currentPrice),
          method: sub.paymentMethod || "PIX",
          status: "PAID",
          note: `Validação automática de pagamento do ciclo ${sub.billingCycle}.`,
        });

        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "ATIVO",
            nextBillingDate: currentNext,
            paymentHistory: history,
          },
        });

        // Atualiza todas as licenças vinculadas a esta assinatura com nova data e re-assinatura RSA
        for (const lic of sub.licenses) {
          await this.prisma.license.update({
            where: { id: lic.id },
            data: {
              status: "ACTIVE",
              expiresAt: currentNext,
            },
          });
          // Sincroniza com Firebase Firestore
          await this.firebaseLicenseSync.publishLicense({
            id: lic.id,
            key: lic.activationKey,
            clientId: sub.clientId,
            clientName: sub.client?.name,
            planCode: sub.plan?.code || "PRO",
            planName: sub.plan?.name,
            status: "ACTIVE",
            expiresAt: currentNext,
            allowedFeatures: lic.allowedFeatures,
            action: "RENEW",
          });
          // Notifica CTRL-Farm da renovação
          await this.ctrlFarmNotifier.notifyLicenseActivation(lic.activationKey, currentNext.toISOString());
        }

        // Sincroniza renovação da assinatura no Firebase Firestore
        await this.firebaseLicenseSync.publishSubscription({
          id: sub.id,
          clientId: sub.clientId,
          clientName: sub.client?.name,
          planId: sub.planId,
          planCode: sub.plan?.code,
          status: "ATIVO",
          billingCycle: sub.billingCycle,
          nextBillingDate: currentNext,
          lastPaymentDate: now,
          paymentStatus: "PAID",
        });

        await this.prisma.auditLog.create({
          data: {
            action: "SUBSCRIPTION_RENEWED",
            performedBy: adminUsername || "Sistema Automático",
            clientId: sub.clientId,
            targetType: "SUBSCRIPTION",
            targetId: sub.id,
            details: {
              cycle: sub.billingCycle,
              newNextBillingDate: currentNext.toISOString(),
              paymentConfirmed: true,
            },
          },
        });

        results.renewed++;
        results.details.push({ id: sub.id, client: sub.client.name, action: "RENEWED", nextBilling: currentNext });
      } else {
        // PAGAMENTO COM ERRO OU PENDENTE NO VENCIMENTO: Suspende imediatamente a assinatura e trava as licenças
        await this.prisma.subscription.update({
          where: { id: sub.id },
          data: {
            status: "SUSPENSO",
          },
        });

        // Trava todas as licenças vinculadas e manda validação imediata ao CTRL-Farm e ao Firebase
        for (const lic of sub.licenses) {
          await this.prisma.license.update({
            where: { id: lic.id },
            data: {
              status: "SUSPENDED",
            },
          });

          // DISPARO IMEDIATO DE SUSPENSÃO PARA O CTRL-FARM (HTTP + Firebase)
          await Promise.allSettled([
            this.ctrlFarmNotifier.notifyLicenseSuspension(
              lic.activationKey,
              "Vencimento do ciclo de cobrança atingido sem confirmação de pagamento.",
            ),
            this.firebaseLicenseSync.publishSuspension(
              lic.activationKey,
              "Vencimento do ciclo de cobrança atingido sem confirmação de pagamento.",
            ),
          ]);
        }

        // Sincroniza status no Firebase Firestore
        await this.firebaseLicenseSync.publishSubscription({
          id: sub.id,
          clientId: sub.clientId,
          clientName: sub.client?.name,
          planId: sub.planId,
          planCode: sub.plan?.code,
          status: "SUSPENSO",
          billingCycle: sub.billingCycle,
          nextBillingDate: sub.nextBillingDate,
          paymentStatus: "PENDING",
        });

        await this.prisma.auditLog.create({
          data: {
            action: "SUBSCRIPTION_SUSPENDED",
            performedBy: adminUsername || "Sistema Automático",
            clientId: sub.clientId,
            targetType: "SUBSCRIPTION",
            targetId: sub.id,
            details: {
              reason: "Vencimento atingido sem confirmação de pagamento",
              dueDate: sub.nextBillingDate.toISOString(),
            },
          },
        });

        results.suspended++;
        results.details.push({ id: sub.id, client: sub.client.name, action: "SUSPENDED", reason: "Pagamento pendente no vencimento" });
      }
    }

    return results;
  }

  /**
   * Valida o pagamento individual de uma assinatura (chamado quando o usuário clica em verificar pagamento no pop-up)
   */
  async verifyPayment(id: string, adminUsername?: string) {
    const sub = await this.findOne(id);
    const now = new Date();

    const recentPaidTransaction = await this.prisma.paymentTransaction.findFirst({
      where: {
        OR: [
          { subscriptionId: sub.id, status: { in: ["PAID", "APPROVED", "CONFIRMED"] } },
          { clientId: sub.clientId, status: { in: ["PAID", "APPROVED", "CONFIRMED"] } },
        ],
        createdAt: { gte: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7) }, // últimos 7 dias
      },
      orderBy: { createdAt: "desc" },
    });

    if (
      recentPaidTransaction ||
      sub.status === "ATIVO" ||
      sub.paymentMethod === "CORTESIA" ||
      sub.plan.code === "UNLIMITED_OWNER"
    ) {
      // Reativa se estiver suspensa
      const currentNext = new Date(sub.nextBillingDate > now ? sub.nextBillingDate : now);
      if (currentNext <= now) {
        if (sub.billingCycle === "ANNUAL") currentNext.setFullYear(currentNext.getFullYear() + 1);
        else if (sub.billingCycle === "QUARTERLY") currentNext.setMonth(currentNext.getMonth() + 3);
        else currentNext.setMonth(currentNext.getMonth() + 1);
      }

      await this.prisma.subscription.update({
        where: { id: sub.id },
        data: {
          status: "ATIVO",
          nextBillingDate: currentNext,
        },
      });

      for (const lic of sub.licenses) {
        await this.prisma.license.update({
          where: { id: lic.id },
          data: {
            status: "ACTIVE",
            expiresAt: currentNext,
          },
        });
        // Notifica o CTRL-Farm para liberação imediata
        await this.ctrlFarmNotifier.notifyLicenseActivation(lic.activationKey, currentNext.toISOString());
        // Sincroniza com o Firebase Firestore
        await this.firebaseLicenseSync.publishLicense({
          id: lic.id,
          key: lic.activationKey,
          clientId: sub.clientId,
          clientName: sub.client?.name,
          planCode: sub.plan?.code || "PRO",
          planName: sub.plan?.name,
          status: "ACTIVE",
          expiresAt: currentNext,
          allowedFeatures: lic.allowedFeatures,
          action: "ACTIVATE",
        });
      }

      await this.firebaseLicenseSync.publishSubscription({
        id: sub.id,
        clientId: sub.clientId,
        clientName: sub.client?.name,
        planId: sub.planId,
        planCode: sub.plan?.code,
        status: "ATIVO",
        billingCycle: sub.billingCycle,
        nextBillingDate: currentNext,
        paymentStatus: "PAID",
      });

      return {
        success: true,
        status: "ATIVO",
        message: "Pagamento confirmado com sucesso! Assinatura e licença reativadas.",
      };
    }

    return {
      success: false,
      status: sub.status,
      message: "Nenhum pagamento confirmado foi identificado até o momento.",
    };
  }

  /**
   * Checagem abrangente de assinaturas, pagamentos e sincronização total com o Firebase Firestore
   */
  async checkAllSubscriptionsAndLicenses(adminUsername?: string) {
    this.logger.log(
      `Iniciando checagem global de assinaturas, pagamentos e sincronização Firebase (Iniciado por: ${
        adminUsername || "Sistema Automático"
      })...`,
    );

    // 1. Processa assinaturas vencidas
    const dueResults = await this.processDueSubscriptions(adminUsername);

    // 2. Verifica licenças avulsas ou com prazo expirado
    const now = new Date();
    const expiredLicenses = await this.prisma.license.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: { lt: now },
      },
      include: { client: true, plan: true },
    });

    for (const lic of expiredLicenses) {
      await this.prisma.license.update({
        where: { id: lic.id },
        data: { status: "EXPIRED" },
      });
      await Promise.allSettled([
        this.ctrlFarmNotifier.notifyLicenseSuspension(lic.activationKey, "Validade da licença expirada."),
        this.firebaseLicenseSync.publishSuspension(lic.activationKey, "Validade da licença expirada."),
      ]);
    }

    // 3. Sincroniza todas as licenças ativas com o Firestore para garantia de alta disponibilidade
    const activeLicenses = await this.prisma.license.findMany({
      where: { status: "ACTIVE" },
      include: { client: true, plan: true },
    });

    for (const lic of activeLicenses) {
      await this.firebaseLicenseSync.publishLicense({
        id: lic.id,
        key: lic.activationKey,
        clientId: lic.clientId,
        clientName: lic.client?.name,
        clientEmail: lic.client?.email,
        planCode: lic.plan.code,
        planName: lic.plan.name,
        status: "ACTIVE",
        expiresAt: lic.expiresAt,
        maxPrinters: lic.plan.maxPrinters,
        maxCompanies: lic.plan.maxCompanies,
        allowedFeatures: lic.allowedFeatures,
        action: "SYNC",
      });
    }

    this.logger.log(
      `Checagem concluída: ${dueResults.total} assinaturas analisadas (${dueResults.renewed} renovadas, ${dueResults.suspended} suspensas), ${expiredLicenses.length} licenças expiradas, ${activeLicenses.length} licenças sincronizadas com Firebase.`,
    );

    return {
      success: true,
      timestamp: new Date().toISOString(),
      dueResults,
      expiredLicensesCount: expiredLicenses.length,
      activeLicensesSynced: activeLicenses.length,
    };
  }
}
