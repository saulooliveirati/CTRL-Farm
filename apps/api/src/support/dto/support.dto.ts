import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTicketDto {
  @ApiProperty({ description: "Assunto do chamado de suporte", example: "Dificuldade de adesão na mesa com filamento PETG" })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ description: "Primeira mensagem ou dúvida do usuário", example: "Minha peça está descolando nos cantos." })
  @IsString()
  @IsOptional()
  initialMessage?: string;
}

export class SendSupportMessageDto {
  @ApiProperty({ description: "Conteúdo da mensagem ou legenda", example: "Estou enviando a foto do bico aquecido." })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: "Tipo da mensagem", enum: ["TEXT", "IMAGE", "VIDEO", "AUDIO", "REMOTE_INVITE", "SYSTEM"], default: "TEXT" })
  @IsString()
  @IsOptional()
  messageType?: "TEXT" | "IMAGE" | "VIDEO" | "AUDIO" | "REMOTE_INVITE" | "SYSTEM";

  @ApiPropertyOptional({ description: "URL ou caminho da mídia anexada", example: "/support/media/files/abc.jpg" })
  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @ApiPropertyOptional({ description: "Tipo de remetente", enum: ["USER", "AI_BOT", "ADMIN"] })
  @IsString()
  @IsOptional()
  senderType?: "USER" | "AI_BOT" | "ADMIN";

  @ApiPropertyOptional({ description: "Nome visível do remetente" })
  @IsString()
  @IsOptional()
  senderName?: string;
}

export class RespondRemoteSessionDto {
  @ApiProperty({ description: "ID da sessão remota" })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: "Se o cliente autorizou ou rejeitou a sessão", example: true })
  @IsBoolean()
  authorized: boolean;
}
