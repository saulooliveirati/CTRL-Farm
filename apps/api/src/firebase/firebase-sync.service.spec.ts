import { describe, it, expect, vi, beforeEach } from "vitest";
import { FirebaseSyncService } from "./firebase-sync.service.js";

describe("FirebaseSyncService", () => {
  let service: FirebaseSyncService;
  let mockPrisma: any;
  let mockFirebase: any;

  beforeEach(() => {
    mockPrisma = {
      company: { findMany: vi.fn().mockResolvedValue([{ id: "comp-1", name: "Farm 3D", active: true }]) },
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: "usr-1", companyId: "comp-1", name: "Operador", email: "op@farm.com", role: "OPERATOR", active: true },
        ]),
      },
      printer: { findMany: vi.fn().mockResolvedValue([{ id: "print-1", companyId: "comp-1", name: "Ender 3", status: "READY" }]) },
      filament: { findMany: vi.fn().mockResolvedValue([{ id: "fil-1", companyId: "comp-1", material: "PLA", brand: "eSun" }]) },
      inventoryMaterial: { findMany: vi.fn().mockResolvedValue([]) },
      productionJob: { findMany: vi.fn().mockResolvedValue([]) },
      customer: { findMany: vi.fn().mockResolvedValue([]) },
      supplier: { findMany: vi.fn().mockResolvedValue([]) },
      customerOrder: { findMany: vi.fn().mockResolvedValue([]) },
      projectFile: { findMany: vi.fn().mockResolvedValue([]) },
      userLicense: { findMany: vi.fn().mockResolvedValue([{ id: "lic-1", companyId: "comp-1", status: "ACTIVE" }]) },
      $queryRawUnsafe: vi.fn().mockResolvedValue([]),
    };

    mockFirebase = {
      isConfigured: vi.fn().mockReturnValue(false),
      getFirestore: vi.fn().mockReturnValue(null),
    };

    service = new FirebaseSyncService(mockPrisma, mockFirebase);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return initial sync stats", () => {
    const stats = service.getSyncStats();
    expect(stats.status).toBe("IDLE");
    expect(stats.totalDocuments).toBe(0);
  });

  it("should perform syncAll in local fallback mode when Firestore is unconfigured", async () => {
    const result = await service.syncAll("comp-1");
    expect(result.status).toBe("SUCCESS");
    expect(result.mode).toBe("LOCAL_STORE_FALLBACK");
    expect(result.collections.companies).toBe(1);
    expect(result.collections.users).toBe(1);
    expect(result.collections.printers).toBe(1);
    expect(result.collections.filaments).toBe(1);
    expect(result.totalDocuments).toBe(5); // 1 comp + 1 user + 1 printer + 1 filament + 1 license
  });

  it("should sanitize user data during sync by never exposing passwords", async () => {
    await service.syncAll("comp-1");
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          id: true,
          email: true,
          name: true,
          role: true,
        }),
      })
    );
    // Verifica que password não foi selecionado
    const selectArgs = mockPrisma.user.findMany.mock.calls[0][0].select;
    expect(selectArgs.password).toBeUndefined();
  });
});
