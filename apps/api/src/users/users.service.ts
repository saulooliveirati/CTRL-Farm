import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../database/prisma.service.js";
import type { AdminUpdateUserDto } from "./dto/admin-update-user.dto.js";
import type { ChangePasswordDto } from "./dto/change-password.dto.js";
import type { CreateUserDto } from "./dto/create-user.dto.js";
import type { UpdateUserDto } from "./dto/update-user.dto.js";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string) {
    return this.prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user || !user.active) {
      throw new NotFoundException("Usuário não encontrado ou inativo.");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      companyId: user.companyId,
      companyName: user.company?.name ?? "",
      companyCreatedAt: user.company?.createdAt ?? null,
    };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    const updates: { name?: string; email?: string } = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) {
        throw new BadRequestException("O nome não pode ficar vazio.");
      }
      updates.name = trimmedName;
    }

    if (dto.email !== undefined) {
      const trimmedEmail = dto.email.trim().toLowerCase();
      if (!trimmedEmail) {
        throw new BadRequestException("O e-mail não pode ficar vazio.");
      }
      if (trimmedEmail !== user.email) {
        const existing = await this.prisma.user.findUnique({ where: { email: trimmedEmail } });
        if (existing) {
          throw new ConflictException("Este e-mail já está em uso por outro usuário.");
        }
        updates.email = trimmedEmail;
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updates,
      include: { company: { select: { id: true, name: true, createdAt: true } } },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      active: updated.active,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      companyId: updated.companyId,
      companyName: updated.company?.name ?? "",
      companyCreatedAt: updated.company?.createdAt ?? null,
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.active) {
      throw new NotFoundException("Usuário não encontrado.");
    }

    const passwordMatches = await bcrypt.compare(dto.currentPassword, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException("A senha atual informada está incorreta.");
    }

    if (!dto.newPassword || dto.newPassword.length < 6) {
      throw new BadRequestException("A nova senha deve ter no mínimo 6 caracteres.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return {
      message: "Senha alterada com sucesso!",
    };
  }

  async create(companyId: string, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("Já existe um usuário cadastrado com este e-mail.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        companyId,
        name: dto.name.trim(),
        email,
        password: hashedPassword,
        role: dto.role,
        active: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async adminUpdate(companyId: string, id: string, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) {
      throw new NotFoundException("Usuário não encontrado nesta empresa.");
    }

    const data: {
      name?: string;
      email?: string;
      role?: typeof dto.role;
      active?: boolean;
      password?: string;
    } = {};

    if (dto.name !== undefined) {
      const trimmedName = dto.name.trim();
      if (!trimmedName) throw new BadRequestException("O nome não pode ficar vazio.");
      data.name = trimmedName;
    }

    if (dto.email !== undefined) {
      const trimmedEmail = dto.email.trim().toLowerCase();
      if (!trimmedEmail) throw new BadRequestException("O e-mail não pode ficar vazio.");
      if (trimmedEmail !== user.email) {
        const existing = await this.prisma.user.findUnique({ where: { email: trimmedEmail } });
        if (existing) throw new ConflictException("Este e-mail já está em uso por outro usuário.");
        data.email = trimmedEmail;
      }
    }

    if (dto.role !== undefined) {
      data.role = dto.role;
    }

    if (dto.active !== undefined) {
      data.active = dto.active;
    }

    if (dto.password) {
      if (dto.password.length < 6) {
        throw new BadRequestException("A nova senha deve ter no mínimo 6 caracteres.");
      }
      const salt = await bcrypt.genSalt(10);
      data.password = await bcrypt.hash(dto.password, salt);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async remove(companyId: string, id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException("Você não pode excluir a sua própria conta de administrador.");
    }

    const user = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!user) {
      throw new NotFoundException("Usuário não encontrado nesta empresa.");
    }

    await this.prisma.user.delete({ where: { id } });

    return { message: "Usuário removido com sucesso." };
  }
}
