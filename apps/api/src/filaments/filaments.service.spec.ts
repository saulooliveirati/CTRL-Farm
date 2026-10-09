import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";

import { FilamentsService } from "./filaments.service.js";

describe("FilamentsService", () => {
  it("define o peso disponível como o peso inicial ao cadastrar", async () => {
    const create = vi.fn().mockResolvedValue({ id: "f1" });
    const service = new FilamentsService({ filament: { create } } as never);

    await service.create("company-1", { material: "PLA", brand: "Marca", color: "Preto", initialWeightG: 1000 });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ companyId: "company-1", currentWeightG: 1000, initialWeightG: 1000 }),
      include: { supplier: { select: { id: true, name: true } } },
    });
  });

  it("rejeita peso atual maior que o inicial", async () => {
    const create = vi.fn();
    const service = new FilamentsService({ filament: { create } } as never);

    expect(() => service.create("company-1", { material: "PLA", brand: "Marca", color: "Preto", initialWeightG: 1000, currentWeightG: 1200 })).toThrow(BadRequestException);
    expect(create).not.toHaveBeenCalled();
  });

  it("não expõe bobina de outra empresa ao atualizar peso", async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const update = vi.fn();
    const service = new FilamentsService({ filament: { findFirst, update } } as never);

    await expect(service.update("company-1", "f2", { currentWeightG: 200 })).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it("retorna conflito ao excluir bobina com produções vinculadas", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "filament-1", _count: { productionJobs: 1 } });
    const remove = vi.fn();
    const service = new FilamentsService({ filament: { findFirst, delete: remove } } as never);
    await expect(service.remove("company-1", "filament-1")).rejects.toBeInstanceOf(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });
});
