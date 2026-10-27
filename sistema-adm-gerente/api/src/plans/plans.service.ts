import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(includePrivate = true) {
    const where: any = { active: true };
    if (!includePrivate) {
      where.isPublic = true;
    }
    return this.prisma.plan.findMany({
      where,
      orderBy: { monthlyPrice: "asc" },
      include: {
        _count: {
          select: {
            subscriptions: true,
            licenses: true,
          },
        },
      },
    });
  }

  async findByCode(code: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        _count: { select: { subscriptions: true, licenses: true } },
      },
    });
    if (!plan) {
      throw new NotFoundException(`Plano ${code} não encontrado.`);
    }
    return plan;
  }

  async findById(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: { select: { subscriptions: true, licenses: true } },
      },
    });
    if (!plan) {
      throw new NotFoundException(`Plano com id ${id} não encontrado.`);
    }
    return plan;
  }
}
