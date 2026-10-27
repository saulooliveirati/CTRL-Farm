import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../database/prisma.service.js";
import { AdminLoginDto, RefreshTokenDto } from "./dto/login.dto.js";
import {
  ChangeAdminPasswordDto,
  ForgotPasswordRequestDto,
  UpdateAdminProfileDto,
} from "./dto/admin-profile.dto.js";

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

  async updateProfile(
    adminId: string,
    dto: UpdateAdminProfileDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException("Administrador não encontrado.");
    }

    // Valida unicidade de username se fornecido e alterado
    if (dto.username && dto.username.trim() !== admin.username) {
      const cleanUsername = dto.username.trim();
      const existingUser = await this.prisma.adminUser.findFirst({
        where: {
          username: { equals: cleanUsername, mode: "insensitive" },
          id: { not: adminId },
        },
      });
      if (existingUser) {
        throw new ConflictException(`O nome de usuário "${cleanUsername}" já está em uso.`);
      }
    }

    // Valida unicidade de email se fornecido e alterado
    if (dto.email && dto.email.trim() !== admin.email) {
      const cleanEmail = dto.email.trim().toLowerCase();
      const existingEmail = await this.prisma.adminUser.findFirst({
        where: {
          email: { equals: cleanEmail, mode: "insensitive" },
          id: { not: adminId },
        },
      });
      if (existingEmail) {
        throw new ConflictException(`O e-mail "${cleanEmail}" já está cadastrado para outro administrador.`);
      }
    }

    const updated = await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.username ? { username: dto.username.trim() } : {}),
        ...(dto.email ? { email: dto.email.trim().toLowerCase() } : {}),
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "ADMIN_PROFILE_UPDATED",
        performedBy: admin.username,
        adminUserId: admin.id,
        targetType: "SYSTEM",
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "Browser",
        details: {
          updatedFields: Object.keys(dto),
          previous: { name: admin.name, username: admin.username, email: admin.email },
          new: { name: updated.name, username: updated.username, email: updated.email },
        },
      },
    });

    return updated;
  }

  async changePassword(
    adminId: string,
    dto: ChangeAdminPasswordDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundException("Administrador não encontrado.");
    }

    const passwordMatches = await bcrypt.compare(dto.currentPassword, admin.password);
    if (!passwordMatches) {
      throw new BadRequestException("A senha atual informada está incorreta.");
    }

    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException("A nova senha deve ser diferente da senha atual.");
    }

    const newHashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: {
        password: newHashedPassword,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "ADMIN_PASSWORD_CHANGED",
        performedBy: admin.username,
        adminUserId: admin.id,
        targetType: "SYSTEM",
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "Browser",
        details: { message: "Senha administrativa alterada com sucesso." },
      },
    });

    return {
      success: true,
      message: "Senha alterada com sucesso! Utilize a nova senha no próximo login.",
    };
  }

  async requestPasswordReset(
    dto: ForgotPasswordRequestDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const cleanEmail = dto.email.trim().toLowerCase();
    const admin = await this.prisma.adminUser.findFirst({
      where: { email: { equals: cleanEmail, mode: "insensitive" } },
    });

    if (!admin) {
      this.logger.warn(`Solicitação de recuperação para e-mail não cadastrado: ${cleanEmail}`);
      // Resposta genérica segura para não vazar existência de emails
      return {
        success: true,
        message:
          "Se este e-mail estiver cadastrado como Administrador Geral, as instruções de recuperação serão processadas.",
      };
    }

    await this.prisma.auditLog.create({
      data: {
        action: "ADMIN_PASSWORD_RESET_REQUESTED",
        performedBy: admin.username,
        adminUserId: admin.id,
        targetType: "SYSTEM",
        ipAddress: ipAddress || "127.0.0.1",
        userAgent: userAgent || "Browser",
        details: {
          email: cleanEmail,
          message: "Solicitação de recuperação de senha registrada pelo administrador.",
        },
      },
    });

    return {
      success: true,
      message: `Instruções de redefinição de acesso enviadas para o e-mail de recuperação: ${cleanEmail}`,
    };
  }
}
