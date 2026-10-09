import { describe, expect, it, vi } from "vitest";

import { ProductionService } from "./production.service.js";

describe("ProductionService", () => {
  it("debita o peso planejado ao concluir e atualiza a impressora", async () => {
    const job = { id: "job-1", companyId: "company-1", printerId: "printer-1", filamentId: "filament-1", orderId: "order-1", status: "PRINTING", plannedWeightG: 40, startedAt: new Date() };
    const findFirst = vi.fn().mockResolvedValue(job);
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const printerUpdate = vi.fn().mockResolvedValue({});
    const orderUpdate = vi.fn().mockResolvedValue({});
    const productionUpdate = vi.fn().mockResolvedValue({ id: "job-1", status: "COMPLETED", actualWeightG: 40 });
    const tx = { productionJob: { findFirst, update: productionUpdate }, filament: { updateMany }, printer: { update: printerUpdate }, customerOrder: { update: orderUpdate } };
    const transaction = vi.fn((callback: (client: typeof tx) => unknown) => callback(tx));
    const service = new ProductionService({ $transaction: transaction } as never);

    const result = await service.update("company-1", "job-1", { status: "COMPLETED" });

    expect(result).toMatchObject({ status: "COMPLETED", actualWeightG: 40 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "filament-1", companyId: "company-1", currentWeightG: { gte: 40 } },
      data: { currentWeightG: { decrement: 40 } },
    });
    expect(printerUpdate).toHaveBeenCalledWith({ where: { id: "printer-1" }, data: { status: "READY" } });
    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: "order-1" }, data: { status: "COMPLETED" } });
  });

  it("impede iniciar duas ordens simultâneas na mesma impressora", async () => {
    const job = { id: "job-2", companyId: "company-1", printerId: "printer-1", status: "QUEUED", plannedWeightG: 30, startedAt: null };
    const findFirst = vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce({ id: "job-1" });
    const update = vi.fn();
    const tx = { productionJob: { findFirst, update }, filament: {}, printer: { update: vi.fn() } };
    const service = new ProductionService({ $transaction: (callback: (client: typeof tx) => unknown) => callback(tx) } as never);

    await expect(service.update("company-1", "job-2", { status: "PRINTING" })).rejects.toThrow("Esta impressora já possui uma produção em andamento.");
    expect(update).not.toHaveBeenCalled();
  });
});
