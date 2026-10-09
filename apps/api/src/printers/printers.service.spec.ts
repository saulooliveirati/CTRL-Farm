import { describe, expect, it, vi } from "vitest";
import { ConflictException, NotFoundException } from "@nestjs/common";

import { PrintersService } from "./printers.service.js";

describe("PrintersService", () => {
  it("lista somente impressoras da empresa autenticada", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new PrintersService({ printer: { findMany } } as never);

    await service.findAll("company-1");

    expect(findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  it("não permite alterar impressora pertencente a outra empresa", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const update = vi.fn();
    const service = new PrintersService({ printer: { findFirst, update } } as never);

    await expect(service.update("company-1", "printer-2", { status: "READY" })).rejects.toBeInstanceOf(NotFoundException);
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: "printer-2", companyId: "company-1" },
      select: { id: true },
    });
    expect(update).not.toHaveBeenCalled();
  });

  it("retorna conflito ao excluir impressora com produções vinculadas", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "printer-1", _count: { productionJobs: 1 } });
    const remove = vi.fn();
    const service = new PrintersService({ printer: { findFirst, delete: remove } } as never);
    await expect(service.remove("company-1", "printer-1")).rejects.toBeInstanceOf(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });
});
