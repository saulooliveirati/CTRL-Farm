import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../database/prisma.service.js";
import { CreateCustomerDto } from "./dto/create-customer.dto.js";
import { UpdateCustomerDto } from "./dto/update-customer.dto.js";

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      include: { _count: { select: { orders: true } } },
    });
  }

  async create(companyId: string, dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({
        data: {
          companyId,
          name: dto.name.trim(),
          document: dto.document?.trim() || null,
          email: dto.email?.trim().toLowerCase() || null,
          phone: dto.phone?.trim() || null,
          notes: dto.notes?.trim() || null,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error))
        throw new ConflictException("Já existe um cliente com este documento.");
      throw error;
    }
  }

  async update(companyId: string, id: string, dto: UpdateCustomerDto) {
    await this.ensureOwned(companyId, id);
    try {
      return await this.prisma.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.document !== undefined && { document: dto.document.trim() || null }),
          ...(dto.email !== undefined && { email: dto.email.trim().toLowerCase() || null }),
          ...(dto.phone !== undefined && { phone: dto.phone.trim() || null }),
          ...(dto.notes !== undefined && { notes: dto.notes.trim() || null }),
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error))
        throw new ConflictException("Já existe um cliente com este documento.");
      throw error;
    }
  }

  async remove(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado.");
    const orders = await this.prisma.customerOrder.count({ where: { customerId: id, companyId } });
    if (orders > 0)
      throw new ConflictException(
        "Este cliente possui pedidos vinculados e não pode ser removido.",
      );
    await this.prisma.customer.delete({ where: { id } });
    return { id };
  }

  private async ensureOwned(companyId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado.");
  }

  private isUniqueViolation(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
