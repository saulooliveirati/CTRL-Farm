import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { ProductionService } from "./production.service.js";

describe("ProductionService", () => {
  it("debita o peso planejado ao concluir e atualiza a impressora", async () => {
    const job = {
      id: "job-1",
      companyId: "company-1",
      printerId: "printer-1",
      filamentId: "filament-1",
      orderId: "order-1",
      status: "PRINTING",
      plannedWeightG: 40,
      startedAt: new Date(),
    };
    const findFirst = vi.fn().mockResolvedValue(job);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const printerUpdate = vi.fn().mockResolvedValue({});
    const orderUpdate = vi.fn().mockResolvedValue({});
    const productionUpdate = vi
      .fn()
      .mockResolvedValue({ id: "job-1", status: "COMPLETED", actualWeightG: 40 });
    const tx = {
      productionJob: { findFirst, update: productionUpdate, count: vi.fn().mockResolvedValue(0) },
      filament: { updateMany },
      printer: { update: printerUpdate },
      customerOrder: { update: orderUpdate },
    };
    const transaction = vi.fn((callback: (client: typeof tx) => unknown) => callback(tx));
    const service = new ProductionService({ $transaction: transaction } as never);

    const result = await service.update("company-1", "job-1", { status: "COMPLETED" });

    expect(result).toMatchObject({ status: "COMPLETED", actualWeightG: 40 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "filament-1", companyId: "company-1", currentWeightG: { gte: 40 } },
      data: { currentWeightG: { decrement: 40 } },
    });
    expect(printerUpdate).toHaveBeenCalledWith({
      where: { id: "printer-1" },
      data: expect.objectContaining({ status: "READY" }),
    });
    expect(orderUpdate).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: { status: "COMPLETED" },
    });
  });

  it("impede iniciar duas ordens simultâneas na mesma impressora", async () => {
    const job = {
      id: "job-2",
      companyId: "company-1",
      printerId: "printer-1",
      status: "QUEUED",
      plannedWeightG: 30,
      startedAt: null,
    };
    const findFirst = vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce({ id: "job-1" });
    const update = vi.fn();
    const tx = { productionJob: { findFirst, update }, filament: {}, printer: { update: vi.fn() } };
    const service = new ProductionService({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);

    await expect(service.update("company-1", "job-2", { status: "PRINTING" })).rejects.toThrow(
      "Esta impressora já possui uma produção em andamento.",
    );
    expect(update).not.toHaveBeenCalled();
  });

  it("permite excluir produção cancelada sem início ou consumo", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "job-1",
      status: "CANCELLED",
      startedAt: null,
      actualWeightG: null,
    });
    const remove = vi.fn();
    const service = new ProductionService({
      productionJob: { findFirst, delete: remove },
    } as never);
    await expect(service.remove("company-1", "job-1")).resolves.toEqual({ id: "job-1" });
    expect(remove).toHaveBeenCalledWith({ where: { id: "job-1" } });
  });

  it("preserva produções que já foram iniciadas", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "job-1",
      status: "CANCELLED",
      startedAt: new Date(),
      actualWeightG: null,
    });
    const remove = vi.fn();
    const service = new ProductionService({
      productionJob: { findFirst, delete: remove },
    } as never);
    await expect(service.remove("company-1", "job-1")).rejects.toBeInstanceOf(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });

  it("corrige consumo concluído e devolve a diferença ao estoque", async () => {
    const job = {
      id: "job-1",
      companyId: "company-1",
      filamentId: "filament-1",
      status: "COMPLETED",
      actualWeightG: 50,
    };
    const findFirst = vi.fn().mockResolvedValue(job);
    const filamentUpdate = vi.fn();
    const productionUpdate = vi.fn().mockResolvedValue({ ...job, actualWeightG: 42 });
    const tx = {
      productionJob: { findFirst, update: productionUpdate },
      filament: { update: filamentUpdate },
    };
    const service = new ProductionService({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);

    await service.update("company-1", "job-1", { actualWeightG: 42 });

    expect(filamentUpdate).toHaveBeenCalledWith({
      where: { id: "filament-1" },
      data: { currentWeightG: { increment: 8 } },
    });
    expect(productionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { actualWeightG: 42 } }),
    );
  });

  it("desconta pausas do tempo ativo e acumula o trecho atual", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T12:01:30.000Z"));
    const job = {
      id: "job-1",
      companyId: "company-1",
      printerId: "printer-1",
      status: "PRINTING",
      startedAt: new Date("2026-10-09T12:00:00.000Z"),
      activeSince: new Date("2026-10-09T12:00:00.000Z"),
      actualDurationSeconds: 70,
      orderId: null,
    };
    const productionUpdate = vi.fn().mockResolvedValue({ id: "job-1", status: "PAUSED" });
    const tx = {
      productionJob: { findFirst: vi.fn().mockResolvedValue(job), update: productionUpdate },
      printer: { update: vi.fn() },
    };
    const service = new ProductionService({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);
    try {
      await service.update("company-1", "job-1", { status: "PAUSED" });
      expect(productionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ activeSince: null, actualDurationSeconds: 160 }),
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("arquiva concluída sem apagar seus dados", async () => {
    const update = vi.fn();
    const service = new ProductionService({
      productionJob: {
        findFirst: vi.fn().mockResolvedValue({ id: "job-1", status: "COMPLETED" }),
        update,
      },
    } as never);
    await expect(service.remove("company-1", "job-1")).resolves.toMatchObject({
      id: "job-1",
      archived: true,
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job-1" },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
  });
});
