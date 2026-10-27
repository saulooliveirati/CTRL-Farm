import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { LicensesService } from "../licenses/licenses.service.js";
import { CtrlFarmNotifierService } from "../integrations/ctrlfarm-notifier.service.js";
import { FirebaseLicenseSyncService } from "../firebase/firebase-license-sync.service.js";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly licensesService: LicensesService,
    private readonly ctrlFarmNotifier: CtrlFarmNotifierService,
    private readonly firebaseLicenseSync: FirebaseLicenseSyncService,
  ) {}

  /**
   * Processamento unificado de Webhooks para Mercado Pago, PagSeguro, InfinitePay e Asaas
   */
  async handleWebhook(provider: string, body: any, headers?: Record<string, any>) {
    const cleanProvider = provider.toUpperCase().replace("-", "_");
    this.logger.log(`Recebido webhook de pagamento do provedor: ${cleanProvider}`);

    let gatewayPaymentId = "";
    let status = "PENDING";
    let amount = 0;
    let paymentMethod = "PIX";
    let clientId: string | null = null;
    let subscriptionId: string | null = null;

    // Normalização por Gateway
    switch (cleanProvider) {
      case "MERCADO_PAGO": {
        // Mercado pago envia { action: "payment.created"|"payment.updated", data: { id: "12345" } }
        gatewayPaymentId = String(body.data?.id || body.id || "MP-" + Date.now());
        const action = body.action || body.type;
        if (action === "payment.created" || action === "payment.updated" || body.topic === "payment") {
          status = "APPROVED"; // Simulado / verificado via token
        }
        amount = Number(body.transaction_amount || 39.9);
        paymentMethod = body.payment_method_id === "pix" ? "PIX" : "CREDIT_CARD";
        subscriptionId = body.external_reference || null;
        break;
      }

      case "PAGSEGURO": {
        gatewayPaymentId = String(body.id || body.reference_id || "PAG-" + Date.now());
        const chargeStatus = body.charges?.[0]?.status || body.status;
        status = chargeStatus === "PAID" ? "APPROVED" : "PENDING";
        amount = Number(body.charges?.[0]?.amount?.value ? body.charges[0].amount.value / 100 : 39.9);
        paymentMethod = body.charges?.[0]?.payment_method?.type || "PIX";
        subscriptionId = body.reference_id || null;
        break;
      }

      case "INFINITEPAY": {
        gatewayPaymentId = String(body.transaction_id || body.id || "INF-" + Date.now());
        status = body.status === "paid" || body.status === "confirmed" ? "APPROVED" : "PENDING";
        amount = Number(body.amount ? body.amount / 100 : 39.9);
        paymentMethod = "PIX";
        subscriptionId = body.metadata?.subscriptionId || null;
        break;
      }

      case "ASAAS": {
        gatewayPaymentId = String(body.payment?.id || body.id || "ASAAS-" + Date.now());
        const event = body.event;
        status = event === "PAYMENT_CONFIRMED" || event === "PAYMENT_RECEIVED" ? "APPROVED" : "PENDING";
        amount = Number(body.payment?.value || 39.9);
        paymentMethod = body.payment?.billingType || "PIX";
        subscriptionId = body.payment?.externalReference || null;
        break;
      }

      default:
        gatewayPaymentId = "GW-" + Date.now();
        status = "APPROVED";
    }

    // Salva o registro da transação
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        provider: cleanProvider,
        gatewayPaymentId,
        amount,
        method: paymentMethod,
        status,
        subscriptionId,
        clientId,
        paidAt: status === "APPROVED" ? new Date() : null,
        rawPayload: body,
      },
    });

    // Se o pagamento for aprovado e estiver vinculado a uma assinatura
    if (status === "APPROVED" && subscriptionId) {
      const subscription = await this.prisma.subscription.findUnique({
        where: { id: subscriptionId },
        include: { client: true, plan: true },
      });

      if (subscription) {
        // Atualiza status da assinatura
        const nextDate = new Date();
        if (subscription.billingCycle === "ANNUAL") nextDate.setFullYear(nextDate.getFullYear() + 1);
        else if (subscription.billingCycle === "QUARTERLY") nextDate.setMonth(nextDate.getMonth() + 3);
        else nextDate.setMonth(nextDate.getMonth() + 1);

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ATIVO",
            nextBillingDate: nextDate,
          },
        });

        // Sincroniza pagamento aprovado e renovação no Firebase Firestore
        await this.firebaseLicenseSync.publishSubscription({
          id: subscription.id,
          clientId: subscription.clientId,
          clientName: subscription.client?.name,
          planId: subscription.planId,
          planCode: subscription.plan?.code,
          status: "ATIVO",
          billingCycle: subscription.billingCycle,
          nextBillingDate: nextDate,
          lastPaymentDate: new Date(),
          paymentStatus: "PAID",
        });

        // Verifica configuração se deve gerar/estender licença automaticamente
        const settings = await this.prisma.systemSettings.findUnique({ where: { id: "default" } });
        if (settings?.autoGenerateLicenseOnPayment !== false) {
          // Gera nova licença RSA para o cliente
          const newLicense = await this.licensesService.generate(
            {
              clientId: subscription.clientId,
              planId: subscription.planId,
              subscriptionId: subscription.id,
              validityDays: subscription.billingCycle === "ANNUAL" ? 365 : 30,
            },
            `Webhook:${cleanProvider}`,
          );

          if (newLicense?.activationKey) {
            await this.ctrlFarmNotifier.notifyLicenseActivation(
              newLicense.activationKey,
              newLicense.expiresAt?.toISOString()
            );
          }
        }
      }
    }

    // Registra auditoria
    await this.prisma.auditLog.create({
      data: {
        action: `PAYMENT_WEBHOOK_${cleanProvider}`,
        performedBy: `Gateway:${cleanProvider}`,
        targetType: "PAYMENT",
        targetId: transaction.id,
        details: {
          gatewayPaymentId,
          amount,
          status,
          method: paymentMethod,
        },
      },
    });

    return { received: true, transactionId: transaction.id, status };
  }

  async getTransactions(query?: { provider?: string; status?: string; limit?: number }) {
    const limit = Math.min(100, Math.max(1, query?.limit ?? 50));
    const where: any = {};
    if (query?.provider) where.provider = query.provider.toUpperCase();
    if (query?.status) where.status = query.status.toUpperCase();

    return this.prisma.paymentTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        gatewayConfig: {
          select: { name: true, provider: true },
        },
      },
    });
  }
}
