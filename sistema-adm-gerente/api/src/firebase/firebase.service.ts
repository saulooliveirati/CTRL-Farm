import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getAuth, type Auth } from "firebase-admin/auth";

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;
  private configured = false;

  onModuleInit() {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

      if (!projectId || !clientEmail || !privateKey) {
        this.logger.warn(
          "🔥 Sistema ADM - Firebase Admin SDK: Variáveis (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) não configuradas. Operando com armazenamento local de fallback."
        );
        this.configured = false;
        return;
      }

      // Sanitiza e normaliza chave privada (remove aspas externas e converte \\n literais)
      privateKey = privateKey.trim();
      if (
        (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
        (privateKey.startsWith("'") && privateKey.endsWith("'"))
      ) {
        privateKey = privateKey.slice(1, -1);
      }

      if (privateKey.includes("\\n")) {
        privateKey = privateKey.replace(/\\n/g, "\n");
      }

      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.app = existingApps[0]!;
      } else {
        this.app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          storageBucket: storageBucket || `${projectId}.appspot.com`,
        });
      }

      this.configured = true;
      this.logger.log(`🔥 Sistema ADM - Firebase Admin conectado ao projeto: ${projectId}`);
    } catch (err: any) {
      this.logger.error(`🔥 Falha ao inicializar Firebase no Sistema ADM: ${err.message}`);
      this.configured = false;
    }
  }

  isConfigured(): boolean {
    return this.configured && this.app !== null;
  }

  getStorage(): Storage | null {
    if (!this.isConfigured() || !this.app) return null;
    return getStorage(this.app);
  }

  getFirestore(): Firestore | null {
    if (!this.isConfigured() || !this.app) return null;
    return getFirestore(this.app);
  }

  getMessaging(): Messaging | null {
    if (!this.isConfigured() || !this.app) return null;
    return getMessaging(this.app);
  }

  getAuth(): Auth | null {
    if (!this.isConfigured() || !this.app) return null;
    return getAuth(this.app);
  }
}
