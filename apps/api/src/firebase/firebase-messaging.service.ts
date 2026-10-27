import { Injectable, Logger } from "@nestjs/common";
import { FirebaseService } from "./firebase.service.js";

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  clickUrl?: string;
  data?: Record<string, string>;
}

@Injectable()
export class FirebaseMessagingService {
  private readonly logger = new Logger(FirebaseMessagingService.name);
  // Armazena tokens em memória caso não haja persistência externa configurada
  private tokenStore = new Map<string, Set<string>>();

  constructor(private readonly firebase: FirebaseService) {}

  /**
   * Associa um token FCM de push notification a um usuário ou empresa
   */
  registerToken(targetId: string, token: string) {
    if (!this.tokenStore.has(targetId)) {
      this.tokenStore.set(targetId, new Set());
    }
    this.tokenStore.get(targetId)!.add(token);
    this.logger.log(`[FCM] Token registrado para o identificador: ${targetId}`);
    return true;
  }

  /**
   * Remove token FCM
   */
  unregisterToken(targetId: string, token: string) {
    if (this.tokenStore.has(targetId)) {
      this.tokenStore.get(targetId)!.delete(token);
    }
  }

  /**
   * Envia notificação Push para um token FCM específico
   */
  async sendToToken(token: string, payload: PushNotificationPayload): Promise<boolean> {
    const messaging = this.firebase.getMessaging();
    if (!messaging) {
      this.logger.log(`[FCM Mock] Push enviado para ${token.slice(0, 10)}...: ${payload.title} - ${payload.body}`);
      return true;
    }

    try {
      await messaging.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        webpush: {
          notification: {
            icon: payload.icon || "/favicon.ico",
          },
          fcmOptions: {
            link: payload.clickUrl || "/",
          },
        },
      });

      this.logger.log(`[FCM] Notificação enviada com sucesso para ${token.slice(0, 10)}...`);
      return true;
    } catch (err: any) {
      this.logger.warn(`[FCM] Erro ao enviar notificação para token: ${err.message}`);
      return false;
    }
  }

  /**
   * Envia notificação Push para todos os dispositivos associados a um usuário ou empresa
   */
  async sendToTarget(targetId: string, payload: PushNotificationPayload): Promise<number> {
    const tokens = this.tokenStore.get(targetId);
    if (!tokens || tokens.size === 0) {
      return 0;
    }

    let successCount = 0;
    for (const token of tokens) {
      const ok = await this.sendToToken(token, payload);
      if (ok) successCount++;
    }

    return successCount;
  }

  /**
   * Envia notificação para um tópico FCM (ex.: 'printers-alerts', 'updates')
   */
  async sendToTopic(topic: string, payload: PushNotificationPayload): Promise<boolean> {
    const messaging = this.firebase.getMessaging();
    if (!messaging) {
      this.logger.log(`[FCM Mock] Mensagem enviada para tópico '${topic}': ${payload.title}`);
      return true;
    }

    try {
      await messaging.send({
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });

      return true;
    } catch (err: any) {
      this.logger.warn(`[FCM] Falha ao enviar para tópico '${topic}': ${err.message}`);
      return false;
    }
  }
}
