import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service.js";

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.company.findMany();
  }
}