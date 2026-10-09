import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { CustomersService } from "./customers.service.js";

describe("CustomersService", () => {
  it("preserva o tenant e normaliza e-mail no cadastro", async () => {
    const create = vi.fn().mockResolvedValue({ id: "customer-1" });
    const service = new CustomersService({ customer: { create } } as never);

    await service.create("company-1", { name: "  Cliente  ", email: "  USER@EXAMPLE.COM " });

    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ companyId: "company-1", name: "Cliente", email: "user@example.com" }) });
  });

  it("mantém cliente no histórico quando há pedidos", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "customer-1" });
    const count = vi.fn().mockResolvedValue(1);
    const deleteCustomer = vi.fn();
    const service = new CustomersService({ customer: { findFirst, delete: deleteCustomer }, customerOrder: { count } } as never);

    await expect(service.remove("company-1", "customer-1")).rejects.toBeInstanceOf(ConflictException);
    expect(deleteCustomer).not.toHaveBeenCalled();
  });
});
