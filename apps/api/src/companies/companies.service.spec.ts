import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../database/prisma.service.js";
import { CompaniesService } from "./companies.service.js";

describe("CompaniesService", () => {
  let service: CompaniesService;
  let prisma: { company: { findMany: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    prisma = {
      company: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
  });

  it("filters results by company and returns a safe projection", async () => {
    await service.findAll("company-1");

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: { id: "company-1" },
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
  });
});