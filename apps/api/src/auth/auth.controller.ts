import { Body, Controller, Get, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

import { CurrentUser } from "./decorators/current-user.decorator.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
import { TwoFactorDisableDto, TwoFactorEnableDto } from "./dto/two-factor.dto.js";
import type { AuthenticatedUser } from "./interfaces/authenticated-user.interface.js";
import { AuthService } from "./auth.service.js";
import { RegisterService } from "./services/register.service.js";
import { TwoFactorService } from "./services/two-factor.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registerService: RegisterService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Get("health")
  health() {
    return {
      status: "ok",
      module: "auth",
    };
  }

  @Post("register")
  @ApiOperation({ summary: "Cadastra uma empresa e seu primeiro administrador" })
  @ApiCreatedResponse({ description: "Empresa e administrador cadastrados." })
  @ApiConflictResponse({ description: "O e-mail já está cadastrado." })
  register(@Body() dto: RegisterDto) {
    return this.registerService.register(dto);
  }

  @Post("login")
  @ApiOperation({ summary: "Autentica um usuário" })
  @ApiOkResponse({ description: "Token e dados básicos do usuário ou desafio 2FA." })
  @ApiUnauthorizedResponse({ description: "E-mail ou senha inválidos." })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retorna o usuário autenticado" })
  @ApiOkResponse({ description: "Dados do usuário autenticado." })
  @ApiUnauthorizedResponse({ description: "Token ausente, inválido ou expirado." })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }

  @Get("2fa/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Retorna o status da autenticação em duas etapas do usuário" })
  @ApiOkResponse({ description: "Status de ativação do 2FA." })
  twoFactorStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.getStatus(user.id);
  }

  @Post("2fa/setup")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Inicia configuração do 2FA gerando QR code e códigos de backup" })
  @ApiOkResponse({ description: "Secret, QR Code em base64 e códigos de backup." })
  twoFactorSetup(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.setup(user.id, user.email);
  }

  @Post("2fa/enable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Valida o código do aplicativo autenticador e ativa o 2FA" })
  @ApiOkResponse({ description: "Confirmação de ativação do 2FA." })
  twoFactorEnable(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorEnableDto) {
    return this.twoFactorService.enable(user.id, dto.code);
  }

  @Post("2fa/disable")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Desativa o 2FA mediante confirmação de senha" })
  @ApiOkResponse({ description: "2FA desativado." })
  async twoFactorDisable(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorDisableDto) {
    const isPasswordValid = await this.authService.verifyUserPassword(user.id, dto.currentPassword);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Senha atual incorreta. Não foi possível desativar o 2FA.");
    }
    return this.twoFactorService.disable(user.id);
  }

  @Post("2fa/backup-codes")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Gera novos códigos de recuperação reserva" })
  @ApiOkResponse({ description: "Nova lista de códigos de recuperação." })
  twoFactorGenerateBackupCodes(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.generateBackupCodes(user.id);
  }
}
