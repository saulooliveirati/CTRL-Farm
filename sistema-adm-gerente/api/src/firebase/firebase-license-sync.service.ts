import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";

export interface PublishLicensePayload {
  id: string;
  key: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  planCode: string;
  planName?: string;
  status: string;
  expiresAt: Date | string | null;
  maxPrinters?: number;
  maxCompanies?: number;
  allowedFeatures?: any;
  suspendedReason?: string | null;
  subscriptionId?: string | null;
  lastPaymentStatus?: string | null;
  action?: string;
}

export interface PublishSubscriptionPayload {
  id: string;
  clientId: string;
  clientName?: string;
  planId: string;
  planCode?: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd?: Date | string | null;
  nextBillingDate?: Date | string | null;
  lastPaymentDate?: Date | string | null;
  paymentStatus?: string | null;
}

@Injectable()
export class FirebaseLicenseSyncService {
  private readonly logger = new Logger(FirebaseLicenseSyncService.name);

  constructor(private readonly firebase: FirebaseService) {}

  /**
   * Publica ou atualiza uma licença completa no Firestore para validação externa e em tempo real pelo CTRL-Farm
   */
  async publishLicense(license: PublishLicensePayload): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      const cleanKey = license.key.trim().toUpperCase();
      const isActive = license.status === "ACTIVE";

      await firestore.collection("licenses").doc(cleanKey).set(
        {
          id: license.id,
          key: cleanKey,
          activationKey: cleanKey,
          clientId: license.clientId,
          clientName: license.clientName || null,
          clientEmail: license.clientEmail || null,
          planCode: license.planCode,
          planName: license.planName || license.planCode,
          status: license.status,
          active: isActive,
          expiresAt: license.expiresAt ? new Date(license.expiresAt).toISOString() : null,
          maxPrinters: license.maxPrinters ?? 9999,
          maxCompanies: license.maxCompanies ?? 1,
          allowedFeatures: license.allowedFeatures || {},
          suspendedReason: license.suspendedReason || null,
          subscriptionId: license.subscriptionId || null,
          lastPaymentStatus: license.lastPaymentStatus || (isActive ? "PAID" : "PENDING"),
          action: license.action || (isActive ? "ACTIVATE" : license.status),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      this.logger.log(
        `[Firebase ADM] Licença ${cleanKey} sincronizada no Firestore (Status: ${license.status}, Plano: ${license.planCode})`,
      );
      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase ADM] Erro ao sincronizar licença ${license.key} no Firestore: ${err.message}`);
      return false;
    }
  }

  /**
   * Notifica e aplica pausa imediata de licença no Firebase Firestore
   */
  async publishPause(licenseKey: string, reason = "Licença pausada pelo administrador"): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      await firestore.collection("licenses").doc(cleanKey).set(
        {
          key: cleanKey,
          activationKey: cleanKey,
          status: "PAUSED",
          active: false,
          suspendedReason: reason,
          action: "PAUSE",
          pausedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      this.logger.warn(`[Firebase ADM] ⏸️ Licença ${cleanKey} marcada como PAUSADA no Firestore!`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase ADM] Erro ao pausar licença ${licenseKey} no Firestore: ${err.message}`);
      return false;
    }
  }

  /**
   * Notifica e aplica suspensão imediata de licença no Firebase Firestore
   */
  async publishSuspension(
    licenseKey: string,
    reason = "Assinatura suspensa por pendência financeira",
  ): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      await firestore.collection("licenses").doc(cleanKey).set(
        {
          key: cleanKey,
          activationKey: cleanKey,
          status: "SUSPENDED",
          active: false,
          suspendedReason: reason,
          action: "SUSPEND",
          suspendedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      this.logger.warn(`[Firebase ADM] 🚨 Licença ${cleanKey} marcada como SUSPENSA no Firestore!`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase ADM] Erro ao suspender licença ${licenseKey} no Firestore: ${err.message}`);
      return false;
    }
  }

  /**
   * Notifica e aplica revogação de licença no Firebase Firestore
   */
  async publishRevocation(licenseKey: string, reason = "Licença revogada pelo administrador"): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      await firestore.collection("licenses").doc(cleanKey).set(
        {
          key: cleanKey,
          activationKey: cleanKey,
          status: "REVOKED",
          active: false,
          suspendedReason: reason,
          action: "REVOKE",
          revokedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      this.logger.warn(`[Firebase ADM] ⛔ Licença ${cleanKey} marcada como REVOGADA no Firestore!`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase ADM] Erro ao revogar licença ${licenseKey} no Firestore: ${err.message}`);
      return false;
    }
  }

  /**
   * Remove ou desativa documento de licença excluída no Firebase Firestore
   */
  async deleteLicenseDoc(licenseKey: string): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      await firestore.collection("licenses").doc(cleanKey).set(
        {
          key: cleanKey,
          activationKey: cleanKey,
          status: "DELETED",
          active: false,
          action: "DELETE",
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      this.logger.log(`[Firebase ADM] Licença ${cleanKey} marcada como DELETED no Firestore.`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase ADM] Erro ao marcar licença excluída ${licenseKey} no Firestore: ${err.message}`);
      return false;
    }
  }

  /**
   * Sincroniza status da assinatura de um cliente
   */
  async publishSubscription(subscription: PublishSubscriptionPayload): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      await firestore.collection("subscriptions").doc(subscription.id).set(
        {
          id: subscription.id,
          clientId: subscription.clientId,
          clientName: subscription.clientName || null,
          planId: subscription.planId,
          planCode: subscription.planCode || null,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          currentPeriodEnd: subscription.currentPeriodEnd
            ? new Date(subscription.currentPeriodEnd).toISOString()
            : null,
          nextBillingDate: subscription.nextBillingDate
            ? new Date(subscription.nextBillingDate).toISOString()
            : null,
          lastPaymentDate: subscription.lastPaymentDate
            ? new Date(subscription.lastPaymentDate).toISOString()
            : null,
          paymentStatus: subscription.paymentStatus || (subscription.status === "ATIVO" ? "PAID" : "PENDING"),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      this.logger.log(
        `[Firebase ADM] Assinatura ${subscription.id} sincronizada no Firestore (Status: ${subscription.status})`,
      );
      return true;
    } catch (err: any) {
      this.logger.warn(
        `[Firebase ADM] Erro ao sincronizar assinatura ${subscription.id} no Firestore: ${err.message}`,
      );
      return false;
    }
  }
}
