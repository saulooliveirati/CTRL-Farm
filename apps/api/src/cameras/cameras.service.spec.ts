import { ConflictException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { CameraQuality } from "@prisma/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { PrismaService } from "../database/prisma.service.js";
import { CamerasService } from "./cameras.service.js";

describe("CamerasService", () => {
  let service: CamerasService;
  let prismaMock: {
    camera: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let originalFetch: typeof globalThis.fetch;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    prismaMock = {
      camera: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue({ id: "cam-1" }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CamerasService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "MEDIAMTX_API_URL") return "http://127.0.0.1:9997";
              if (key === "MEDIAMTX_API_PASSWORD") return "secret";
              if (key === "MEDIAMTX_API_USER") return "ctrlfarm-api";
              return null;
            },
            getOrThrow: () => "fallback-jwt-secret-for-cameras-12345",
          },
        },
      ],
    }).compile();

    service = module.get<CamerasService>(CamerasService);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("lists cameras safe projection without returning ciphertexts", async () => {
    prismaMock.camera.findMany.mockResolvedValue([
      {
        id: "cam-1",
        companyId: "comp-1",
        name: "Câmera Tapo",
        model: "Tapo C200",
        ipAddress: "192.168.1.100",
        quality: CameraQuality.HIGH,
        username: "user",
        streamPath: "cam_1",
        streamConfigured: true,
        createdAt: new Date(),
        passwordCiphertext: "cipher",
        passwordIv: "iv",
        passwordTag: "tag",
      },
    ]);

    const result = await service.findAll("comp-1");
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty("passwordCiphertext");
    expect(result[0]).toHaveProperty("name", "Câmera Tapo");
  });

  it("rejects non-private IP addresses", async () => {
    await expect(
      service.create("comp-1", {
        name: "Câmera Externa",
        ipAddress: "8.8.8.8",
        username: "admin",
        password: "password123",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("creates a Bambu Lab camera and configures MediaMTX stream path", async () => {
    prismaMock.camera.create.mockImplementation(async ({ data }) => ({
      ...data,
      streamConfigured: false,
      createdAt: new Date(),
      passwordCiphertext: "cip",
      passwordIv: "iv",
      passwordTag: "tag",
    }));

    prismaMock.camera.update.mockResolvedValue({
      id: "bambu-cam-1",
      companyId: "comp-1",
      name: "Bambu Lab A1 Cam",
      model: "Bambu Lab A1",
      ipAddress: "192.168.1.150",
      quality: CameraQuality.HIGH,
      username: "bblp",
      streamPath: "cam_bambu1",
      streamConfigured: true,
      createdAt: new Date(),
    });

    const created = await service.create("comp-1", {
      name: "Bambu Lab A1 Cam",
      model: "Bambu Lab A1",
      ipAddress: "192.168.1.150",
      username: "bblp",
      password: "access_code_123",
    });

    expect(created.name).toBe("Bambu Lab A1 Cam");
    expect(created.streamConfigured).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalled();
  });

  it("removes a camera and purges path from MediaMTX", async () => {
    prismaMock.camera.findFirst.mockResolvedValue({
      id: "cam-to-del",
      companyId: "comp-1",
      streamPath: "cam_del_path",
    });

    const result = await service.remove("comp-1", "cam-to-del");
    expect(result).toEqual({ id: "cam-to-del" });
    expect(prismaMock.camera.delete).toHaveBeenCalledWith({ where: { id: "cam-to-del" } });
  });

  it("throws NotFoundException when removing a non-existent camera", async () => {
    prismaMock.camera.findFirst.mockResolvedValue(null);
    await expect(service.remove("comp-1", "missing-id")).rejects.toThrow(NotFoundException);
  });

  it("tests draft connection and probes camera reachable status", async () => {
    vi.spyOn(service, "probeCamera").mockResolvedValue({
      reachable: true,
      authenticated: true,
      statusCode: 200,
      message: "Conexão validada",
    });

    const result = await service.testDraftConnection({
      name: "Tapo Test",
      ipAddress: "192.168.1.55",
      username: "admin",
      password: "password123",
    });

    expect(result.reachable).toBe(true);
    expect(result.authenticated).toBe(true);
    expect(result.ipAddress).toBe("192.168.1.55");
  });
});
