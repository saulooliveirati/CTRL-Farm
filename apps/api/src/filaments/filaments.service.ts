import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service.js";
import { CreateFilamentDto } from "./dto/create-filament.dto.js";
import { UpdateFilamentDto } from "./dto/update-filament.dto.js";

@Injectable()
export class FilamentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.filament.findMany({ where: { companyId }, orderBy: { createdAt: "desc" } });
  }

  create(companyId: string, dto: CreateFilamentDto) {
    const currentWeightG = dto.currentWeightG ?? dto.initialWeightG;
    if (currentWeightG > dto.initialWeightG) {
      throw new BadRequestException("O peso atual não pode superar o peso inicial.");
    }
    return this.prisma.filament.create({
      data: {
        companyId,
        material: dto.material,
        brand: dto.brand.trim(),
        color: dto.color.trim(),
        initialWeightG: dto.initialWeightG,
        currentWeightG,
        ...(dto.price !== undefined && { price: dto.price }),
        lot: dto.lot?.trim() || null,
        purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : null,
      },
    });
  }

  async update(companyId: string, id: string, dto: UpdateFilamentDto) {
    const filament = await this.prisma.filament.findFirst({ where: { id, companyId } });
    if (!filament) throw new NotFoundException("Filamento não encontrado.");
    const initialWeightG = dto.initialWeightG ?? filament.initialWeightG;
    const currentWeightG = dto.currentWeightG ?? filament.currentWeightG;
    if (currentWeightG > initialWeightG) {
      throw new BadRequestException("O peso atual não pode superar o peso inicial.");
    }
    return this.prisma.filament.update({
      where: { id },
      data: {
        ...(dto.material !== undefined && { material: dto.material }),
        ...(dto.brand !== undefined && { brand: dto.brand.trim() }),
        ...(dto.color !== undefined && { color: dto.color.trim() }),
        ...(dto.initialWeightG !== undefined && { initialWeightG }),
        ...(dto.currentWeightG !== undefined && { currentWeightG }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.lot !== undefined && { lot: dto.lot.trim() || null }),
        ...(dto.purchasedAt !== undefined && { purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : null }),
      },
    });
  }

  async remove(companyId: string, id: string) {
    const filament = await this.prisma.filament.findFirst({ where: { id, companyId }, select: { id: true, _count: { select: { productionJobs: true } } } });
    if (!filament) throw new NotFoundException("Filamento não encontrado.");
    if (filament._count.productionJobs > 0) throw new ConflictException("Este filamento possui histórico de produção e não pode ser excluído. Mantenha-o para preservar o rastreio de consumo.");
    await this.prisma.filament.delete({ where: { id } });
    return { id };
  }
}
