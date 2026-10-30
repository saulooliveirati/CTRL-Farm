import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { SupportService } from "./support.service.js";
import {
  CreateTicketDto,
  SendSupportMessageDto,
  RespondRemoteSessionDto,
} from "./dto/support.dto.js";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";

@ApiTags("Suporte Inteligente Híbrido & Acesso Remoto")
@Controller("support")
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post("tickets")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Abre um novo chamado de suporte (Nível 1 IA)" })
  async createTicket(@Body() dto: CreateTicketDto, @Req() req: any) {
    let user: AuthenticatedUser = req.user;
    if (!user) {
      user = await this.supportService.getDefaultUserAndCompany();
    }
    return this.supportService.createTicket(user, dto);
  }

  @Get("tickets")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Lista chamados de suporte (filtrados por empresa ou todos para ADM)" })
  listTickets(
    @Query("companyId") companyId?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("all") all?: string,
    @Req() req?: any
  ) {
    const user = req?.user as AuthenticatedUser | undefined;
    const isAdmView = all === "true" || !user;
    const targetCompanyId = isAdmView ? companyId : (companyId || user?.companyId);

    return this.supportService.listTickets({
      companyId: targetCompanyId,
      status,
      search,
    });
  }

  @Get("tickets/:id")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Obtém detalhes do chamado, mensagens e sessões remotas" })
  getTicket(@Param("id") id: string) {
    return this.supportService.getTicketById(id);
  }

  @Post("tickets/:id/messages")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Envia uma mensagem no chamado" })
  sendMessage(
    @Param("id") ticketId: string,
    @Body() dto: SendSupportMessageDto,
    @Req() req: any
  ) {
    const user = req?.user as AuthenticatedUser | undefined;
    const senderType = dto.senderType || (user ? "USER" : "USER");
    const senderName = dto.senderName || user?.name || "Operador";

    return this.supportService.sendMessage(ticketId, {
      ...dto,
      senderType,
      senderName,
    });
  }

  @Post("tickets/:id/escalate")
  @ApiOperation({ summary: "Transborda o chamado para atendimento humano no Sistema ADM" })
  escalate(@Param("id") ticketId: string, @Body("reason") reason?: string) {
    return this.supportService.escalateToHuman(ticketId, reason);
  }

  @Post(["tickets/:id/remote-access", "tickets/:id/remote/request"])
  @ApiOperation({ summary: "Solicita acesso remoto assistido (ADM -> Cliente)" })
  requestRemoteAccess(
    @Param("id") ticketId: string,
    @Body("adminName") adminName?: string
  ) {
    return this.supportService.requestRemoteAccess(ticketId, adminName || "Suporte Técnico Humano");
  }

  @Post(["tickets/:id/remote-access/respond", "tickets/:id/remote/respond"])
  @ApiOperation({ summary: "Responde à solicitação de acesso remoto (Cliente autoriza ou recusa)" })
  respondRemoteAccess(
    @Param("id") ticketId: string,
    @Body() dto: RespondRemoteSessionDto
  ) {
    return this.supportService.respondRemoteSession(dto);
  }

  @Post(["tickets/:id/remote-access/end", "tickets/:id/remote/end"])
  @ApiOperation({ summary: "Encerra a sessão de acesso remoto assistido" })
  endRemoteAccess(@Body("sessionId") sessionId: string) {
    return this.supportService.endRemoteSession(sessionId);
  }

  @Post("tickets/:id/close")
  @ApiOperation({ summary: "Finaliza o chamado de suporte" })
  closeTicket(@Param("id") ticketId: string) {
    return this.supportService.updateTicketStatus(ticketId, "CLOSED");
  }

  @Patch("tickets/:id/status")
  @ApiOperation({ summary: "Atualiza o status do chamado (ex: RESOLVED, CLOSED)" })
  updateStatus(
    @Param("id") ticketId: string,
    @Body("status") status: string
  ) {
    return this.supportService.updateTicketStatus(ticketId, status);
  }
}
