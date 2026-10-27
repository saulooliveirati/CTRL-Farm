import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../database/prisma.service.js";
import { AdminLoginDto, RefreshTokenDto } from "./dto/login.dto.js";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: AdminLoginDto, ipAddress?: string, userAgent?: string) {
    const identifier = dto.username.trim();

    // Busca por username ou email
    const admin = await this.prisma.adminUser.findFirst({
      where: {
        OR: [
          { username: { equals: identifier, mode: "insensitive" } },
          { email: { equals: identifier, mode: "insensitive" } },
        ],
      },
    });

    if (!admin || !admin.active) {
      this.logger.warn(`Tentativa de login inválida para usuário: ${identifier}`);
      throw new UnauthorizedException("Credenciais administrativas inválidas.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, admin.password);
    if (!passwordMatches) {
      this.logger.warn(`Senha incorreta para usuário: ${identifier}`);
      throw new UnauthorizedException("Credenciais administrativas inválidas.");
    }

    // Gera Tokens
    const payload = {
      sub: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      name: admin.name,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: "8h", // Sessão de 8h no painel admin
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: "7d",
    });

    // Salva hash do refresh token e timestamp de último login
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        refreshToken: refreshTokenHash,
      },
    });

    // Registra Auditoria
    await this.prisma.auditLog.create({
      data: {
        action: "LOGIN",
        performedBy: admin.username,
        adminUserId: admin.id,
        targetType: "SYSTEM",
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "Browser",
        details: { message: "Login administrativo realizado com sucesso." },
      },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: 28800,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        lastLoginAt: admin.lastLoginAt,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const decoded = await this.jwtService.verifyAsync(dto.refreshToken);
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: decoded.sub },
      });

      if (!admin || !admin.active || !admin.refreshToken) {
        throw new UnauthorizedException("Sessão revogada ou expirada.");
      }

      const matches = await bcrypt.compare(dto.refreshToken, admin.refreshToken);
      if (!matches) {
        throw new UnauthorizedException("Token de renovação inválido.");
      }

      const payload = {
        sub: admin.id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        name: admin.name,
      };

      const accessToken = await this.jwtService.signAsync(payload, { expiresIn: "8h" });
      const newRefreshToken = await this.jwtService.signAsync(payload, { expiresIn: "7d" });

      const newRefreshHash = await bcrypt.hash(newRefreshToken, 10);
      await this.prisma.adminUser.update({
        where: { id: admin.id },
        data: { refreshToken: newRefreshHash },
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: "Bearer",
        expiresIn: 28800,
      };
    } catch {
      throw new UnauthorizedException("Refresh token expirado ou inválido.");
    }
  }

  async getMe(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundException("Administrador não encontrado.");
    }

    return admin;
  }
}
