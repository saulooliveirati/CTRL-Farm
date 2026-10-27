import { Test, TestingModule } from "@nestjs/testing";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { PrismaService } from "../database/prisma.service.js";
import { ConsignmentsService } from "./consignments.service.js";

describe("ConsignmentsService", () => {
  let service: ConsignmentsService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      consignmentLocation: {
        count: vi.fn().mockResolvedValue(5),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      consignmentStock: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      consignmentSale: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      consignmentSettlement: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      consignment: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      consignmentItem: {
        create: vi.fn(),
      },
      consignmentMovement: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
      },
      consignmentCommission: {
        create: vi.fn(),
      },
      consignmentPayment: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prismaMock)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsignmentsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ConsignmentsService>(ConsignmentsService);
  });

  it("calculates dashboard metrics successfully", async () => {
    prismaMock.consignmentLocation.count
      .mockResolvedValueOnce(10) // totalPartners
      .mockResolvedValueOnce(8); // activePartners

    prismaMock.consignmentStock.findMany.mockResolvedValue([
      {
        id: "stock-1",
        locationId: "loc-1",
        productName: "Vaso Bob",
        quantityAvailable: 15,
        quantitySold: 5,
        quantityReturned: 1,
        quantityDamaged: 0,
        costPrice: 10,
        sellingPrice: 35,
      },
    ]);

    prismaMock.consignmentSale.findMany.mockResolvedValue([
      {
        id: "sale-1",
        locationId: "loc-1",
        productName: "Vaso Bob",
        quantity: 5,
        grossAmount: 175,
        partnerCommission: 35,
        farmRevenue: 140,
        costPrice: 10,
        netProfit: 90,
        settlementId: null,
        location: { id: "loc-1", name: "Loja Geek" },
      },
    ]);

    const result = await service.getDashboardMetrics("comp-1");

    expect(result.overview.totalPartners).toBe(10);
    expect(result.overview.activePartners).toBe(8);
    expect(result.overview.productsInConsignment).toBe(15);
    expect(result.overview.totalValueInConsignment).toBe(15 * 35);
    expect(result.overview.totalGrossSales).toBe(175);
    expect(result.overview.totalCommissions).toBe(35);
    expect(result.overview.totalNetProfit).toBe(90);
    expect(result.topPartners).toHaveLength(1);
    expect(result.topProducts).toHaveLength(1);
  });

  it("creates a new consignment shipment atomically", async () => {
    prismaMock.consignmentLocation.findFirst.mockResolvedValue({
      id: "loc-1",
      name: "Loja Teste",
      status: "ACTIVE",
      defaultCommissionRate: 20,
      defaultCommissionType: "PERCENTAGE",
    });

    prismaMock.consignment.create.mockResolvedValue({
      id: "shipment-1",
      shipmentNumber: "ENV-2026-0001",
      totalItems: 10,
    });

    prismaMock.consignmentStock.findUnique.mockResolvedValue(null);

    const result = await service.createShipment("comp-1", "user-1", {
      locationId: "loc-1",
      items: [
        {
          productName: "Suporte Headset",
          quantity: 10,
          costPrice: 15,
          suggestedPrice: 50,
          sellingPrice: 50,
        },
      ],
    });

    expect(result).toHaveProperty("id", "shipment-1");
    expect(prismaMock.consignment.create).toHaveBeenCalled();
    expect(prismaMock.consignmentItem.create).toHaveBeenCalled();
    expect(prismaMock.consignmentStock.create).toHaveBeenCalled();
    expect(prismaMock.consignmentMovement.create).toHaveBeenCalled();
  });

  it("registers a consignment sale and updates stock and commission", async () => {
    prismaMock.consignmentLocation.findFirst.mockResolvedValue({
      id: "loc-1",
      name: "Loja Geek",
      defaultCommissionRate: 20,
      defaultCommissionType: "PERCENTAGE",
    });

    prismaMock.consignmentStock.findUnique.mockResolvedValue({
      id: "stock-1",
      locationId: "loc-1",
      productName: "Suporte Headset",
      quantityAvailable: 10,
      costPrice: 15,
      sellingPrice: 50,
    });

    prismaMock.consignmentSale.create.mockResolvedValue({
      id: "sale-1",
      productName: "Suporte Headset",
      quantity: 2,
      grossAmount: 100,
      netProfit: 50,
    });

    const result = await service.registerSale("comp-1", "user-1", {
      locationId: "loc-1",
      productName: "Suporte Headset",
      quantity: 2,
      unitPrice: 50,
    });

    expect(result).toHaveProperty("id", "sale-1");
    expect(prismaMock.consignmentStock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "stock-1" },
        data: expect.objectContaining({
          quantityAvailable: { decrement: 2 },
          quantitySold: { increment: 2 },
        }),
      })
    );
    expect(prismaMock.consignmentCommission.create).toHaveBeenCalled();
    expect(prismaMock.consignmentMovement.create).toHaveBeenCalled();
  });
});
