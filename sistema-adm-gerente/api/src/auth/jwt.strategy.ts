import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../database/prisma.service.js";

export interface AuthenticatedAdmin {
  id: string;
  username: string;
  email: string;
  name: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "admin-jwt") {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.ADM_JWT_SECRET || "adm-ctrlfarm-secret-key-super-secure-token-2026-xyz99",
    });
  }

  async validate(payload: { sub: string; username: string; role: string }): Promise<AuthenticatedAdmin> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        active: true,
      },
    });

    if (!admin || !admin.active) {
      throw new UnauthorizedException("Acesso administrativo revogado ou inativo.");
    }

    return admin;
  }
}
