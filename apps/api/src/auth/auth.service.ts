import {
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../database/prisma.service.js";
import { LoginDto } from "./dto/login.dto.js";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    const passwordMatches =
      user && user.active
        ? await bcrypt.compare(dto.password, user.password)
        : false;

    if (!user || !user.active || !passwordMatches) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
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
      },
    };
  }
}