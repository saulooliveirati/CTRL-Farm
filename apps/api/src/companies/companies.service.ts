import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findAll(companyId: string) {
    return this.prisma.company.findMany({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        tradeName: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { users: true },
        },
      },
    });
  }
}