import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { SuppliersService } from "./suppliers.service.js";

describe("SuppliersService", () => {
  it("não permite remover fornecedor vinculado a materiais", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "supplier-1", _count: { printers: 0, filaments: 1, inventoryMaterials: 0 } });
    const remove = vi.fn();
    const service = new SuppliersService({ supplier: { findFirst, delete: remove } } as never);
    await expect(service.remove("company-1", "supplier-1")).rejects.toBeInstanceOf(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });
});
