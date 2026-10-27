import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { CreatePricingEstimateDto } from "./dto/create-pricing-estimate.dto.js";

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(companyId: string) {
    return this.prisma.pricingEstimate.findMany({
      where: { companyId },
      include: { printer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async create(companyId: string, dto: CreatePricingEstimateDto) {
    const [printer, stockFilaments, stockMaterials] = await Promise.all([
      dto.printerId
        ? this.prisma.printer.findFirst({
            where: { id: dto.printerId, companyId },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      this.prisma.filament.findMany({
        where: {
          id: {
            in: dto.filamentLines
              .map((line) => line.stockId)
              .filter((id): id is string => Boolean(id)),
          },
          companyId,
        },
        select: { id: true },
      }),
      this.prisma.inventoryMaterial.findMany({
        where: {
          id: {
            in: dto.supplyLines
              .map((line) => line.inventoryMaterialId)
              .filter((id): id is string => Boolean(id)),
          },
          companyId,
        },
        select: { id: true },
      }),
    ]);
    if (dto.printerId && !printer)
      throw new NotFoundException("Impressora não encontrada nesta empresa.");
    if (
      stockFilaments.length !==
      new Set(dto.filamentLines.map((line) => line.stockId).filter(Boolean)).size
    ) {
      throw new NotFoundException("Uma das bobinas selecionadas não pertence a esta empresa.");
    }
    if (
      stockMaterials.length !==
      new Set(dto.supplyLines.map((line) => line.inventoryMaterialId).filter(Boolean)).size
    ) {
      throw new NotFoundException("Um dos insumos selecionados não pertence a esta empresa.");
    }

    const printDurationMinutes = dto.printHours * 60 + dto.printMinutes;
    if (printDurationMinutes > 43_200)
      throw new BadRequestException("A duração não pode ultrapassar 720 horas.");
    const durationHours = printDurationMinutes / 60;
    const calculatedFilaments = dto.filamentLines.map((line) => ({
      ...(line.stockId ? { stockId: line.stockId } : {}),
      material: line.material.trim(),
      rollPrice: money(line.rollPrice),
      rollWeightG: line.rollWeightG,
      consumptionG: line.consumptionG,
      cost: money((line.rollPrice / line.rollWeightG) * line.consumptionG),
    }));
    const calculatedSupplies = dto.supplyLines.map((line) => ({
      ...(line.inventoryMaterialId ? { inventoryMaterialId: line.inventoryMaterialId } : {}),
      name: line.name.trim(),
      unit: line.unit.trim(),
      quantity: line.quantity,
      unitCost: money(line.unitCost),
      cost: money(line.quantity * line.unitCost),
    }));

    const materialCost = money(calculatedFilaments.reduce((total, line) => total + line.cost, 0));
    const additionalCost = money(calculatedSupplies.reduce((total, line) => total + line.cost, 0));
    const electricityCost = dto.powerKw * durationHours * dto.electricityPrice;
    const machineCost = money(electricityCost + durationHours * dto.machineRatePerHour);
    const laborCost = money(durationHours * dto.laborRatePerHour);
    const wasteCost = money((materialCost * dto.wastePercent) / 100);
    const totalCost = money(materialCost + wasteCost + additionalCost + machineCost + laborCost);

    const percentageFees = dto.marketplaceFeePercent + dto.paymentFeePercent + dto.taxPercent;
    const deductions = percentageFees + (dto.marginType === "MARGIN" ? dto.marginPercent : 0);
    if (dto.marginType === "FIXED_PRICE" && (!dto.fixedPrice || dto.fixedPrice <= 0)) {
      throw new BadRequestException("Informe um preço fixo maior que zero.");
    }
    if (dto.marginType !== "FIXED_PRICE" && deductions >= 100)
      throw new BadRequestException("Taxas, impostos e margem não podem totalizar 100% ou mais.");
    if (totalCost <= 0)
      throw new BadRequestException(
        "Informe ao menos um custo de material, insumo, máquina ou mão de obra.",
      );

    const priceBeforeRounding =
      dto.marginType === "FIXED_PRICE"
        ? dto.fixedPrice!
        : dto.marginType === "MARGIN"
          ? totalCost / (1 - deductions / 100)
          : (totalCost * (1 + dto.marginPercent / 100)) / (1 - percentageFees / 100);
    const suggestedPrice =
      dto.marginType === "FIXED_PRICE"
        ? money(priceBeforeRounding)
        : Math.ceil(priceBeforeRounding * 100 - 1e-9) / 100;
    const estimatedProfit = money(suggestedPrice * (1 - percentageFees / 100) - totalCost);

    return this.prisma.pricingEstimate.create({
      data: {
        companyId,
        printerId: printer?.id,
        printerName: printer?.name,
        productName: dto.productName.trim(),
        marketplace: dto.marketplace?.trim() || null,
        materialCost,
        machineCost,
        laborCost,
        additionalCost,
        printDurationMinutes,
        powerKw: dto.powerKw,
        electricityPrice: dto.electricityPrice,
        machineRatePerHour: dto.machineRatePerHour,
        laborRatePerHour: dto.laborRatePerHour,
        marginType: dto.marginType,
        fixedPrice: dto.marginType === "FIXED_PRICE" ? suggestedPrice : 0,
        paymentOptions: (dto.paymentOptions ?? []) as Prisma.InputJsonValue,
        wastePercent: dto.wastePercent,
        marketplaceFeePercent: dto.marketplaceFeePercent,
        paymentFeePercent: dto.paymentFeePercent,
        taxPercent: dto.taxPercent,
        marginPercent: dto.marginPercent,
        totalCost,
        suggestedPrice,
        estimatedProfit,
        filamentLines: calculatedFilaments as Prisma.InputJsonValue,
        supplyLines: calculatedSupplies as Prisma.InputJsonValue,
      },
      include: { printer: { select: { id: true, name: true } } },
    });
  }

  async remove(companyId: string, id: string) {
    const estimate = await this.prisma.pricingEstimate.findFirst({
      where: { id, companyId },
      select: { id: true },
    });
    if (!estimate) throw new NotFoundException("Simulação não encontrada.");
    await this.prisma.pricingEstimate.delete({ where: { id } });
    return { id };
  }
}
