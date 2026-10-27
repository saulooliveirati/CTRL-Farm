import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../database/prisma.service.js";
import { ProjectFilesService } from "./project-files.service.js";
import { FirebaseStorageService } from "../firebase/firebase-storage.service.js";

describe("ProjectFilesService", () => {
  let service: ProjectFilesService;
  let prisma: {
    projectFile: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    productionJob: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      projectFile: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      productionJob: {
        findFirst: vi.fn(),
      },
    };

    const mockFirebaseStorage = {
      isAvailable: vi.fn().mockReturnValue(false),
      uploadFile: vi.fn(),
      downloadFile: vi.fn(),
      deleteFile: vi.fn(),
      getSignedUrl: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectFilesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: vi.fn().mockReturnValue(null) } },
        { provide: FirebaseStorageService, useValue: mockFirebaseStorage },
      ],
    }).compile();

    service = module.get<ProjectFilesService>(ProjectFilesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("lists project files for the company", async () => {
    await service.findAll("company-1");
    expect(prisma.projectFile.findMany).toHaveBeenCalledWith({
      where: { companyId: "company-1" },
      include: { productionJob: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }, { projectName: "asc" }],
    });
  });

  describe("parseLink", () => {
    it("rejects invalid URLs", async () => {
      await expect(service.parseLink("not-a-url")).rejects.toThrow(BadRequestException);
    });

    it("parses Printables URL fallback cleanly", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network offline"));
      const result = await service.parseLink(
        "https://www.printables.com/model/12345-crystal-dragon",
      );
      expect(result.success).toBe(true);
      expect(result.platform).toBe("Printables");
      expect(result.platformKey).toBe("printables");
      expect(result.title).toContain("Crystal Dragon");
      expect(result.suggestedTags).toContain("printables");
      expect(result.suggestedTags).toContain("dragon");
    });

    it("parses MakerWorld URL fallback cleanly", async () => {
      vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network offline"));
      const result = await service.parseLink(
        "https://makerworld.com/en/models/998877-cable-guide-clip",
      );
      expect(result.success).toBe(true);
      expect(result.platform).toBe("MakerWorld");
      expect(result.title).toContain("Cable Guide Clip");
      expect(result.suggestedTags).toContain("makerworld");
    });
  });

  describe("createCatalog", () => {
    it("creates a project catalog entry with metadata", async () => {
      const createdItem = {
        id: "proj-1",
        projectName: "Vaso Origami",
        category: "PROJECTS",
      };
      prisma.projectFile.create.mockResolvedValue(createdItem);

      const result = await service.createCatalog("company-1", {
        projectName: "Vaso Origami",
        category: "PROJECTS",
        version: "v1.0",
        description: "Modelo personalizado para cliente",
        tags: ["vaso", "decoracao"],
        externalUrl: "https://makerworld.com/en/models/123",
      });

      expect(prisma.projectFile.create).toHaveBeenCalled();
      expect(result).toEqual(createdItem);
    });
  });
});
