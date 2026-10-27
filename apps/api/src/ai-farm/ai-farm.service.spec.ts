import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { PrismaService } from "../database/prisma.service.js";
import { PrintersService } from "../printers/printers.service.js";
import { FilamentsService } from "../filaments/filaments.service.js";
import { CustomersService } from "../customers/customers.service.js";
import { SuppliersService } from "../suppliers/suppliers.service.js";
import { InventoryMaterialsService } from "../inventory-materials/inventory-materials.service.js";
import { OrdersService } from "../orders/orders.service.js";
import { ProductionService } from "../production/production.service.js";
import { PricingService } from "../pricing/pricing.service.js";
import { ProjectFilesService } from "../project-files/project-files.service.js";
import { CamerasService } from "../cameras/cameras.service.js";
import { AiFarmService } from "./ai-farm.service.js";

describe("AiFarmService", () => {
  let service: AiFarmService;
  let prismaMock: Record<
    string,
    { findUnique?: ReturnType<typeof vi.fn>; findMany?: ReturnType<typeof vi.fn> }
  >;
  let printersServiceMock: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let filamentsServiceMock: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };
  let originalFetch: typeof globalThis.fetch;

  const mockAdminUser: AuthenticatedUser = {
    id: "user-1",
    email: "admin@farm.com",
    name: "Admin User",
    role: "ADMIN",
    companyId: "company-1",
  };

  const mockOperatorUser: AuthenticatedUser = {
    id: "user-2",
    email: "operator@farm.com",
    name: "Operator User",
    role: "OPERATOR",
    companyId: "company-1",
  };

  beforeEach(async () => {
    originalFetch = globalThis.fetch;

    prismaMock = {
      company: { findUnique: vi.fn().mockResolvedValue({ name: "CTRL+Farm Matriz" }) },
      printer: { findMany: vi.fn().mockResolvedValue([]) },
      filament: { findMany: vi.fn().mockResolvedValue([]) },
      supplier: { findMany: vi.fn().mockResolvedValue([]) },
      customer: { findMany: vi.fn().mockResolvedValue([]) },
      inventoryMaterial: { findMany: vi.fn().mockResolvedValue([]) },
      customerOrder: { findMany: vi.fn().mockResolvedValue([]) },
      productionJob: { findMany: vi.fn().mockResolvedValue([]) },
      pricingEstimate: { findMany: vi.fn().mockResolvedValue([]) },
      projectFile: { findMany: vi.fn().mockResolvedValue([]) },
      camera: { findMany: vi.fn().mockResolvedValue([]) },
    };

    printersServiceMock = {
      create: vi.fn().mockResolvedValue({ id: "printer-new" }),
      update: vi.fn().mockResolvedValue({ id: "printer-1" }),
      remove: vi.fn().mockResolvedValue({ success: true }),
    };

    filamentsServiceMock = {
      create: vi.fn().mockResolvedValue({ id: "fil-new" }),
      update: vi.fn().mockResolvedValue({ id: "fil-1" }),
      remove: vi.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiFarmService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "GEMINI_API_KEY") return "test-api-key";
              if (key === "GEMINI_MODEL") return "gemini-3.5-flash";
              return null;
            },
          },
        },
        { provide: PrintersService, useValue: printersServiceMock },
        { provide: FilamentsService, useValue: filamentsServiceMock },
        { provide: CustomersService, useValue: {} },
        { provide: SuppliersService, useValue: {} },
        { provide: InventoryMaterialsService, useValue: {} },
        { provide: OrdersService, useValue: {} },
        { provide: ProductionService, useValue: {} },
        { provide: PricingService, useValue: {} },
        { provide: ProjectFilesService, useValue: {} },
        { provide: CamerasService, useValue: {} },
      ],
    }).compile();

    service = module.get<AiFarmService>(AiFarmService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("chat", () => {
    it("throws BadRequestException for empty or invalid messages", async () => {
      await expect(service.chat(mockAdminUser, [])).rejects.toThrow(BadRequestException);
      await expect(service.chat(mockAdminUser, null)).rejects.toThrow(BadRequestException);
    });

    it("communicates with Gemini API and parses reply and action", async () => {
      const mockGeminiReply = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    reply: "A temperatura ideal para PETG na A1 é 245°C no bico e 75°C na mesa.",
                    action: null,
                  }),
                },
              ],
            },
          },
        ],
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockGeminiReply,
      });

      const result = await service.chat(mockAdminUser, [
        { role: "user", content: "Qual a temperatura para PETG?" },
      ]);

      expect(result.reply).toContain("temperatura ideal para PETG");
      expect(result.action).toBeNull();
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it("falls back to secondary model if primary model returns 503", async () => {
      const mockGeminiReply = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    reply: "Resposta processada pelo modelo de contingência.",
                    action: null,
                  }),
                },
              ],
            },
          },
        ],
      };

      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return {
            ok: false,
            status: 503,
            json: async () => ({ error: { message: "High demand" } }),
          };
        }
        return { ok: true, status: 200, json: async () => mockGeminiReply };
      });

      const result = await service.chat(mockAdminUser, [
        { role: "user", content: "Status da fazenda?" },
      ]);

      expect(callCount).toBe(2);
      expect(result.reply).toBe("Resposta processada pelo modelo de contingência.");
    });
  });

  describe("execute", () => {
    it("rejects unconfirmed actions", async () => {
      await expect(
        service.execute(
          mockAdminUser,
          { resource: "printer", operation: "delete", id: "p-1", summary: "Del" },
          false,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("forbids non-admin/manager roles from executing actions", async () => {
      await expect(
        service.execute(
          mockOperatorUser,
          { resource: "printer", operation: "delete", id: "p-1", summary: "Del" },
          true,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("successfully delegates delete operation to the appropriate service for ADMIN", async () => {
      await service.execute(
        mockAdminUser,
        { resource: "printer", operation: "delete", id: "printer-1", summary: "Remover" },
        true,
      );

      expect(printersServiceMock.remove).toHaveBeenCalledWith("company-1", "printer-1");
    });
  });
});
