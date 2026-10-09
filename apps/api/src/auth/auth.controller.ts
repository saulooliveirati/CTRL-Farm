import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from "@nestjs/common";
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
import type { AuthenticatedUser } from "./interfaces/authenticated-user.interface.js";
import { AuthService } from "./auth.service.js";
import { RegisterService } from "./services/register.service.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registerService: RegisterService,
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
  @ApiOkResponse({ description: "Token e dados básicos do usuário." })
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
    return user;
  }
}