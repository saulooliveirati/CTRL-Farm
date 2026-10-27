import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service.js";
import { AdminLoginDto, RefreshTokenDto } from "./dto/login.dto.js";
import { CurrentAdmin, JwtAdminAuthGuard } from "./jwt-auth.guard.js";
import type { AuthenticatedAdmin } from "./jwt.strategy.js";

@ApiTags("Autenticação Administrativa")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @ApiOperation({ summary: "Efetua login no Sistema ADM Gerente com senha criptografada" })
  login(@Body() dto: AdminLoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown";
    return this.authService.login(dto, ip, userAgent);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Renova o token JWT de acesso utilizando refresh token" })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Get("me")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtém dados do administrador atualmente autenticado" })
  getMe(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.authService.getMe(admin.id);
  }
}
