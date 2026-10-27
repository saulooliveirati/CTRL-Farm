import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../database/prisma.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { TwoFactorService } from "./services/two-factor.service.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: { select: { name: true } } },
    });

    const passwordMatches =
      user && user.active ? await bcrypt.compare(dto.password, user.password) : false;

    if (!user || !user.active || !passwordMatches) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    if (this.twoFactorService.isEnabled(user.id)) {
      if (!dto.twoFactorCode) {
        return {
          requires2FA: true,
          email: user.email,
          message: "Autenticação em duas etapas requerida.",
        };
      }

      const { valid } = this.twoFactorService.verifyCode(user.id, dto.twoFactorCode);
      if (!valid) {
        throw new UnauthorizedException(
          "Código de autenticação em duas etapas inválido ou expirado.",
        );
      }
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      companyName: user.company?.name ?? "",
    });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: 86400,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
        companyName: user.company?.name ?? "",
      },
    };
  }

  async verifyUserPassword(userId: string, plainText: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) return false;
    return bcrypt.compare(plainText, user.password);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { company: { select: { name: true } } },
    });
    if (!user || !user.active)
      throw new UnauthorizedException("Usuário não encontrado ou inativo.");
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      companyName: user.company?.name ?? "",
      role: user.role,
    };
  }
}
