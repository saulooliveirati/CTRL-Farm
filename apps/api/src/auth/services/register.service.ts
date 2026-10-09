import {
  ConflictException,
  Injectable,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../../database/prisma.service.js";
import { RegisterDto } from "../dto/register.dto.js";

@Injectable()
export class RegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ConflictException("Este e-mail já está cadastrado.");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    try {
      return await this.prisma.company.create({
        data: {
          name: dto.companyName.trim(),
          users: {
            create: {
              name: dto.name.trim(),
              email,
              password: hashedPassword,
              role: "ADMIN",
            },
          },
        },
        select: {
          id: true,
          name: true,
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              active: true,
              createdAt: true,
            },
          },
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Este e-mail já está cadastrado.");
      }

      throw error;
    }
  }
}