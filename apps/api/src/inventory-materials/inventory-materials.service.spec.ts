import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { InventoryMaterialsService } from "./inventory-materials.service.js";

describe("InventoryMaterialsService", () => {
  it("não permite vincular fornecedor de outra empresa", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const create = vi.fn();
    const service = new InventoryMaterialsService({
      supplier: { findFirst },
      inventoryMaterial: { create },
    } as never);
    await expect(
      service.create("company-1", {
        name: "Bico",
        category: "SPARE_PART",
        unit: "un",
        supplierId: "supplier-2",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(create).not.toHaveBeenCalled();
  });
});
