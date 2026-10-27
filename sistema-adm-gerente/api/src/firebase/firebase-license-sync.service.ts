import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";

@Injectable()
export class FirebaseLicenseSyncService {
  private readonly logger = new Logger(FirebaseLicenseSyncService.name);

  constructor(private readonly firebase: FirebaseService) {}

  /**
   * Publica ou atualiza uma licença no Firestore para validação externa e em tempo real
   */
  async publishLicense(license: {
    id: string;
    key: string;
    clientId: string;
    planCode: string;
    status: string;
    expiresAt: Date | string | null;
    maxPrinters?: number;
    maxCompanies?: number;
    allowedFeatures?: any;
  }): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      const cleanKey = license.key.trim().toUpperCase();
      await firestore.collection("licenses").doc(cleanKey).set(
        {
          id: license.id,
          key: cleanKey,
          clientId: license.clientId,
          planCode: license.planCode,
          status: license.status,
          active: license.status === "ACTIVE",
          expiresAt: license.expiresAt ? new Date(license.expiresAt).toISOString() : null,
          maxPrinters: license.maxPrinters ?? 9999,
          maxCompanies: license.maxCompanies ?? 1,
          allowedFeatures: Array.isArray(license.allowedFeatures) ? license.allowedFeatures : [],
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      this.logger.log(`[Firebase ADM] Licença ${cleanKey} sincronizada no Firestore (Status: ${license.status})`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase ADM] Erro ao sincronizar licença ${license.key} no Firestore: ${err.message}`);
      return false;
    }
  }

  /**
   * Notifica e aplica suspensão imediata de licença no Firebase Firestore
   */
  async publishSuspension(licenseKey: string, reason = "Assinatura suspensa por pendência financeira"): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      const cleanKey = licenseKey.trim().toUpperCase();
      await firestore.collection("licenses").doc(cleanKey).set(
        {
          key: cleanKey,
          status: "SUSPENDED",
          active: false,
          suspendedReason: reason,
          suspendedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      this.logger.warn(`[Firebase ADM] 🚨 Licença ${cleanKey} marcada como SUSPENSA no Firestore!`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase ADM] Erro ao suspender licença ${licenseKey} no Firestore: ${err.message}`);
      return false;
    }
  }

  /**
   * Sincroniza status da assinatura de um cliente
   */
  async publishSubscription(subscription: {
    id: string;
    clientId: string;
    planId: string;
    status: string;
    billingCycle: string;
    currentPeriodEnd?: Date | string | null;
  }): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      await firestore.collection("subscriptions").doc(subscription.id).set(
        {
          id: subscription.id,
          clientId: subscription.clientId,
          planId: subscription.planId,
          status: subscription.status,
          billingCycle: subscription.billingCycle,
          currentPeriodEnd: subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toISOString() : null,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase ADM] Erro ao sincronizar assinatura ${subscription.id} no Firestore: ${err.message}`);
      return false;
    }
  }
}
