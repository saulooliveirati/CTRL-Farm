import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { SupportAiService } from "./support-ai.service.js";
import {
  CreateTicketDto,
  SendSupportMessageDto,
  RespondRemoteSessionDto,
} from "./dto/support.dto.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";

@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: SupportAiService,
  ) {}

  /**
   * Obtém um usuário e empresa padrão para requisições locais/fallback
   */
  async getDefaultUserAndCompany(): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findFirst({
      include: { company: true },
    });
    if (!user) {
      throw new BadRequestException("Nenhum usuário cadastrado no sistema.");
    }
    return {
      id: user.id,
      name: user.name,
      companyId: user.companyId,
      email: user.email,
      role: user.role as any,
    };
  }

  /**
   * Gera um número de protocolo único no padrão SUP-AAAA-XXXX
   */
  private generateProtocol(): string {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `SUP-${year}-${randomSuffix}`;
  }

  /**
   * Abre um novo chamado de suporte
   */
  async createTicket(user: AuthenticatedUser, dto: CreateTicketDto) {
    if (!user?.companyId || !user?.id) {
      throw new BadRequestException("Usuário e empresa autenticados são obrigatórios.");
    }

    const protocol = this.generateProtocol();

    const ticket = await this.prisma.supportTicket.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        protocol,
        subject: dto.subject.trim(),
        status: "BOT_ACTIVE",
      },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // 1. Mensagem inicial de boas-vindas do Bot de IA Nível 1
    const welcomeContent =
      `Olá, ${user.name}! Sou o Assistente Virtual de Suporte Técnico Nível 1 do CTRL-Farm.\n\n` +
      `Recebi sua solicitação sobre **"${dto.subject.trim()}"** (Protocolo: \`${protocol}\`). ` +
      `Estou analisando a documentação operacional e a telemetria do sistema para lhe ajudar imediatamente.\n\n` +
      `Você pode me descrever detalhes, enviar fotos, áudios ou vídeos. Se preferir um atendimento humano especializado, basta clicar no botão **"Solicitar Atendente Humano"** a qualquer momento!`;

    await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        senderType: "AI_BOT",
        senderName: "CTRL Bot (IA Nível 1)",
        messageType: "TEXT",
        content: welcomeContent,
      },
    });

    // 2. Se o usuário já enviou uma mensagem inicial, registra e responde pela IA
    if (dto.initialMessage?.trim()) {
      await this.sendMessage(ticket.id, {
        senderType: "USER",
        senderName: user.name,
        messageType: "TEXT",
        content: dto.initialMessage.trim(),
      });
    }

    return this.getTicketById(ticket.id);
  }

  /**
   * Lista chamados de suporte
   * - Clientes visualizam apenas chamados de sua empresa
   * - Administradores do ADM visualizam todos os chamados
   */
  async listTickets(options?: {
    companyId?: string;
    status?: string;
    search?: string;
  }) {
    const where: any = {};

    if (options?.companyId) {
      where.companyId = options.companyId;
    }

    if (options?.status && options.status !== "ALL") {
      where.status = options.status;
    }

    if (options?.search?.trim()) {
      const q = options.search.trim();
      where.OR = [
        { protocol: { contains: q, mode: "insensitive" } },
        { subject: { contains: q, mode: "insensitive" } },
        { user: { name: { contains: q, mode: "insensitive" } } },
        { company: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    return this.prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        remoteSessions: {
          orderBy: { requestedAt: "desc" },
          take: 1,
        },
      },
    });
  }

  /**
   * Obtém detalhes completos de um chamado, histórico e sessões remotas
   */
  async getTicketById(ticketId: string, companyId?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        company: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: "asc" },
        },
        remoteSessions: {
          orderBy: { requestedAt: "desc" },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Chamado de suporte ${ticketId} não encontrado.`);
    }

    if (companyId && ticket.companyId !== companyId) {
      throw new ForbiddenException("Você não tem permissão para acessar este chamado.");
    }

    return ticket;
  }

  /**
   * Envia uma mensagem no chamado
   */
  async sendMessage(ticketId: string, dto: SendSupportMessageDto) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 10,
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Chamado de suporte ${ticketId} não encontrado.`);
    }

    if (ticket.status === "CLOSED") {
      throw new BadRequestException("Este chamado já foi encerrado e não aceita novas mensagens.");
    }

    const senderType = dto.senderType || "USER";
    const senderName = dto.senderName || (senderType === "ADMIN" ? "Suporte Técnico Humano" : "Usuário");

    // 1. Salva a mensagem enviada
    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderType,
        senderName,
        messageType: dto.messageType || "TEXT",
        content: dto.content,
        mediaUrl: dto.mediaUrl || null,
      },
    });

    // 2. Atualiza a data de modificação do chamado
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    let aiReplyMessage = null;
    let escalated = false;

    // 3. Se a mensagem partiu do USUÁRIO e o bot estiver ATIVO, processa pela IA Nível 1
    if (senderType === "USER" && ticket.status === "BOT_ACTIVE") {
      const history = ticket.messages.map((m) => ({
        senderType: m.senderType,
        content: m.content,
      }));

      const aiResponse = await this.aiService.processUserMessage({
        ticketSubject: ticket.subject,
        userMessage: dto.content,
        conversationHistory: history,
      });

      if (aiResponse.shouldEscalate) {
        escalated = true;
        await this.prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: "WAITING_HUMAN",
            aiSummary: aiResponse.aiSummary || null,
          },
        });
      }

      // Salva a resposta da IA no chamado
      aiReplyMessage = await this.prisma.supportMessage.create({
        data: {
          ticketId,
          senderType: "AI_BOT",
          senderName: "CTRL Bot (IA Nível 1)",
          messageType: "TEXT",
          content: aiResponse.reply,
        },
      });
    }

    return {
      message,
      aiReply: aiReplyMessage,
      escalated,
      ticketStatus: escalated ? "WAITING_HUMAN" : ticket.status,
    };
  }

  /**
   * Transborda explicitamente o chamado para atendimento humano (Nível 2 ADM)
   */
  async escalateToHuman(ticketId: string, reason?: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!ticket) throw new NotFoundException(`Chamado ${ticketId} não encontrado.`);

    const userMsgs = ticket.messages
      .filter((m) => m.senderType === "USER")
      .map((m) => m.content)
      .join(" | ");

    const aiSummary = reason || `Solicitação de transbordo manual pelo usuário. Últimas interações: ${userMsgs.substring(0, 300) || "Sem mensagens anteriores"}`;

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: "WAITING_HUMAN",
        aiSummary,
      },
    });

    // Registra aviso de sistema no histórico do chat
    const systemNotice = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderType: "AI_BOT",
        senderName: "Sistema CTRL-Farm",
        messageType: "SYSTEM",
        content: "🚨 O chamado foi transferido para a fila de Atendimento Humano Nível 2. Um operador especializado no Sistema ADM foi notificado.",
      },
    });

    return { ticket: updated, systemNotice };
  }

  /**
   * Solicita Acesso Remoto Assistido (disparado pelo Administrador no ADM)
   */
  async requestRemoteAccess(ticketId: string, adminName: string = "Suporte Técnico") {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) throw new NotFoundException(`Chamado ${ticketId} não encontrado.`);

    const session = await this.prisma.remoteSession.create({
      data: {
        ticketId,
        status: "REQUESTED",
        requestedAt: new Date(),
      },
    });

    const inviteMsg = await this.prisma.supportMessage.create({
      data: {
        ticketId,
        senderType: "ADMIN",
        senderName: adminName,
        messageType: "REMOTE_INVITE",
        content: `O suporte técnico (${adminName}) solicitou permissão para acesso remoto assistido à sua tela para diagnóstico e resolução guiada.`,
      },
    });

    return { session, inviteMsg };
  }

  /**
   * Responde à solicitação de Acesso Remoto (Autorizar por 30 minutos ou Recusar)
   */
  async respondRemoteSession(dto: RespondRemoteSessionDto) {
    const session = await this.prisma.remoteSession.findUnique({
      where: { id: dto.sessionId },
    });
    if (!session) throw new NotFoundException(`Sessão remota ${dto.sessionId} não encontrada.`);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutos de sessão

    const updated = await this.prisma.remoteSession.update({
      where: { id: dto.sessionId },
      data: {
        status: dto.authorized ? "AUTHORIZED" : "REJECTED",
        authorizedAt: dto.authorized ? now : null,
        expiresAt: dto.authorized ? expiresAt : null,
      },
    });

    // Atualiza status do chamado para IN_PROGRESS se autorizado
    if (dto.authorized) {
      await this.prisma.supportTicket.update({
        where: { id: session.ticketId },
        data: { status: "IN_PROGRESS" },
      });
    }

    const messageContent = dto.authorized
      ? "✅ Acesso remoto autorizado pelo cliente com sucesso. Sessão temporária ativa com duração máxima de 30 minutos."
      : "❌ O cliente recusou o pedido de acesso remoto à tela.";

    const systemMsg = await this.prisma.supportMessage.create({
      data: {
        ticketId: session.ticketId,
        senderType: "AI_BOT",
        senderName: "Sistema",
        messageType: "SYSTEM",
        content: messageContent,
      },
    });

    return { session: updated, systemMsg };
  }

  /**
   * Encerra a sessão de acesso remoto assistido
   */
  async endRemoteSession(sessionId: string) {
    const session = await this.prisma.remoteSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException(`Sessão remota ${sessionId} não encontrada.`);

    const updated = await this.prisma.remoteSession.update({
      where: { id: sessionId },
      data: { status: "ENDED" },
    });

    await this.prisma.supportMessage.create({
      data: {
        ticketId: session.ticketId,
        senderType: "AI_BOT",
        senderName: "Sistema",
        messageType: "SYSTEM",
        content: "🔒 A sessão de acesso remoto assistido foi finalizada com segurança.",
      },
    });

    return updated;
  }

  /**
   * Atualiza o status do chamado (ex: RESOLVED, CLOSED, IN_PROGRESS)
   */
  async updateTicketStatus(ticketId: string, status: any) {
    const data: any = { status };
    if (status === "CLOSED" || status === "RESOLVED") {
      data.closedAt = new Date();
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data,
    });
  }
}
