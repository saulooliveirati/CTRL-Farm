import { ConflictException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { OrdersService } from "./orders.service.js";

describe("OrdersService", () => {
  it("não aceita cliente de outra empresa", async () => {
    const customerFind = vi.fn().mockResolvedValue(null);
    const create = vi.fn();
    const service = new OrdersService({
      customer: { findFirst: customerFind },
      customerOrder: { create },
    } as never);

    await expect(
      service.create("company-1", {
        customerId: "customer-2",
        description: "Produto",
        unitPrice: 20,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(customerFind).toHaveBeenCalledWith({
      where: { id: "customer-2", companyId: "company-1" },
      select: { id: true },
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("não cancela pedido associado a uma produção", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "order-1",
      status: "DRAFT",
      productionJobs: [{ id: "job-1", status: "QUEUED" }],
    });
    const update = vi.fn();
    const tx = { customerOrder: { findFirst, update } };
    const service = new OrdersService({
      $transaction: (callback: (client: typeof tx) => unknown) => callback(tx),
    } as never);

    await expect(service.cancel("company-1", "order-1")).rejects.toBeInstanceOf(ConflictException);
    expect(update).not.toHaveBeenCalled();
  });

  it("não exclui pedido com produção vinculada", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "order-1",
      productionJobs: [{ id: "job-1" }],
    });
    const remove = vi.fn();
    const service = new OrdersService({ customerOrder: { findFirst, delete: remove } } as never);
    await expect(service.remove("company-1", "order-1")).rejects.toBeInstanceOf(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });
});
