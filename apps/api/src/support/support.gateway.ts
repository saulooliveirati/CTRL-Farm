import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { SupportService } from "./support.service.js";

@WebSocketGateway({
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  namespace: "/support",
})
export class SupportGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(SupportGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(private readonly supportService: SupportService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado ao Suporte WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado do Suporte WebSocket: ${client.id}`);
  }

  /**
   * Conecta o socket à sala do ticket específico ou à sala de administradores do ADM
   */
  @SubscribeMessage("joinTicket")
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string; role?: "USER" | "ADMIN" }
  ) {
    if (payload?.ticketId) {
      const room = `ticket_${payload.ticketId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} entrou na sala ${room}`);
    }

    if (payload?.role === "ADMIN") {
      client.join("support_admins");
      this.logger.log(`Socket ${client.id} registrado na sala de administradores (support_admins)`);
    }

    return { joined: true, ticketId: payload?.ticketId };
  }

  /**
   * Envio de mensagem no chat em tempo real
   */
  @SubscribeMessage("sendMessage")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      ticketId: string;
      senderType: "USER" | "AI_BOT" | "ADMIN";
      senderName?: string;
      messageType?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "REMOTE_INVITE" | "SYSTEM";
      content: string;
      mediaUrl?: string;
    }
  ) {
    const { ticketId, ...dto } = payload;
    const room = `ticket_${ticketId}`;

    try {
      const result = await this.supportService.sendMessage(ticketId, dto);

      // 1. Transmite a mensagem criada para todos na sala do ticket
      this.server.to(room).emit("newMessage", result.message);

      // 2. Se a IA respondeu automaticamente (Nível 1), transmite a resposta
      if (result.aiReply) {
        this.server.to(room).emit("newMessage", result.aiReply);
      }

      // 3. Se a IA detectou que é necessário transbordo humano, notifica o ADM imediatamente
      if (result.escalated) {
        this.server.to("support_admins").emit("escalateToHuman", {
          ticketId,
          status: "WAITING_HUMAN",
          message: "🚨 Novo chamado aguardando atendimento humano no ADM!",
        });
        this.server.to(room).emit("ticketUpdated", {
          ticketId,
          status: "WAITING_HUMAN",
        });
      }

      return { success: true, messageId: result.message.id };
    } catch (err: any) {
      this.logger.error(`Erro ao processar sendMessage via WebSocket: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dispara solicitação de transbordo humano explícito
   */
  @SubscribeMessage("escalateToHuman")
  async handleEscalateToHuman(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string; reason?: string }
  ) {
    const room = `ticket_${payload.ticketId}`;
    try {
      const result = await this.supportService.escalateToHuman(payload.ticketId, payload.reason);

      // Notifica todos na sala e a fila de administradores
      this.server.to(room).emit("newMessage", result.systemNotice);
      this.server.to(room).emit("ticketUpdated", {
        ticketId: payload.ticketId,
        status: "WAITING_HUMAN",
      });

      this.server.to("support_admins").emit("escalateToHuman", {
        ticketId: payload.ticketId,
        ticket: result.ticket,
        reason: payload.reason,
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Administrador solicita Acesso Remoto Assistido
   */
  @SubscribeMessage("requestRemoteAccess")
  async handleRequestRemoteAccess(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string; adminName?: string }
  ) {
    const room = `ticket_${payload.ticketId}`;
    try {
      const result = await this.supportService.requestRemoteAccess(
        payload.ticketId,
        payload.adminName || "Suporte Técnico Humano"
      );

      // Envia evento específico para abrir o modal no cliente
      this.server.to(room).emit("remoteAccessRequested", {
        ticketId: payload.ticketId,
        session: result.session,
      });

      // Publica no chat a mensagem com convite de acesso remoto
      this.server.to(room).emit("newMessage", result.inviteMsg);

      return { success: true, sessionId: result.session.id };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Cliente autoriza ou recusa Acesso Remoto
   */
  @SubscribeMessage("respondRemoteAccess")
  async handleRespondRemoteAccess(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string; sessionId: string; authorized: boolean }
  ) {
    const room = `ticket_${payload.ticketId}`;
    try {
      const result = await this.supportService.respondRemoteSession({
        sessionId: payload.sessionId,
        authorized: payload.authorized,
      });

      // Emite o resultado da autorização para o Administrador e para o Cliente
      this.server.to(room).emit("remoteAccessResponded", {
        ticketId: payload.ticketId,
        session: result.session,
        authorized: payload.authorized,
        expiresAt: result.session.expiresAt,
      });

      this.server.to(room).emit("newMessage", result.systemMsg);

      return { success: true, authorized: payload.authorized };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Finalização da sessão remota
   */
  @SubscribeMessage("endRemoteAccess")
  async handleEndRemoteAccess(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { ticketId: string; sessionId: string }
  ) {
    const room = `ticket_${payload.ticketId}`;
    try {
      const session = await this.supportService.endRemoteSession(payload.sessionId);
      this.server.to(room).emit("remoteAccessEnded", {
        ticketId: payload.ticketId,
        sessionId: payload.sessionId,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Relay de Sinalização WebRTC (Offer, Answer, ICE Candidates)
   */
  @SubscribeMessage("remoteSignaling")
  handleRemoteSignaling(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      ticketId: string;
      signal: any;
      type: "offer" | "answer" | "candidate" | "end";
    }
  ) {
    const room = `ticket_${payload.ticketId}`;
    // Encaminha a sinalização WebRTC para o outro peer na mesma sala do chamado
    client.to(room).emit("remoteSignaling", payload);
  }
}
