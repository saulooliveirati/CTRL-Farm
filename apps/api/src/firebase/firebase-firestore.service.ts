import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";

@Injectable()
export class FirebaseFirestoreService {
  private readonly logger = new Logger(FirebaseFirestoreService.name);

  constructor(private readonly firebase: FirebaseService) {}

  /**
   * Sincroniza telemetria em tempo real de uma impressora 3D para o Firestore
   */
  async syncPrinterTelemetry(
    printerId: string,
    companyId: string,
    telemetryData: Record<string, any>
  ): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      const docRef = firestore
        .collection("companies")
        .doc(companyId)
        .collection("printers")
        .doc(printerId);

      const timestamp = new Date();
      await docRef.set(
        {
          printerId,
          companyId,
          ...telemetryData,
          updatedAt: timestamp,
        },
        { merge: true }
      );

      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase Firestore] Erro ao sincronizar telemetria da impressora ${printerId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Registra uma notificação em tempo real para um usuário ou empresa
   */
  async createNotification(
    targetId: string,
    notification: {
      title: string;
      message: string;
      type: "INFO" | "WARNING" | "ERROR" | "SUCCESS";
      metadata?: Record<string, any>;
    }
  ): Promise<string | null> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return null;

    try {
      const docRef = await firestore
        .collection("notifications")
        .doc(targetId)
        .collection("items")
        .add({
          ...notification,
          read: false,
          createdAt: new Date(),
        });

      return docRef.id;
    } catch (err: any) {
      this.logger.warn(`[Firebase Firestore] Erro ao criar notificação para ${targetId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Sincroniza status do trabalho de impressão (Job)
   */
  async syncPrintJobProgress(
    jobId: string,
    companyId: string,
    progress: {
      status: string;
      percentage: number;
      currentLayer?: number;
      totalLayers?: number;
      remainingTimeMinutes?: number;
      temperatures?: { nozzle?: number; bed?: number };
    }
  ): Promise<boolean> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return false;

    try {
      await firestore
        .collection("companies")
        .doc(companyId)
        .collection("print_jobs")
        .doc(jobId)
        .set(
          {
            jobId,
            ...progress,
            updatedAt: new Date(),
          },
          { merge: true }
        );

      return true;
    } catch (err: any) {
      this.logger.warn(`[Firebase Firestore] Erro ao atualizar progresso do trabalho ${jobId}: ${err.message}`);
      return false;
    }
  }
}
