import { Test, TestingModule } from "@nestjs/testing";
import { CompaniesController } from "./companies.controller.js";
import { CompaniesService } from "./companies.service.js";

describe("CompaniesController", () => {
  let controller: CompaniesController;
  let companiesService: {
    findAll: ReturnType<typeof vi.fn>;
    getMe: ReturnType<typeof vi.fn>;
    updateMe: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    companiesService = {
      findAll: vi.fn().mockResolvedValue([]),
      getMe: vi.fn().mockResolvedValue({ id: "company-1", name: "Farm" }),
      updateMe: vi.fn().mockResolvedValue({ id: "company-1", name: "Farm" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [{ provide: CompaniesService, useValue: companiesService }],
    }).compile();

    controller = module.get<CompaniesController>(CompaniesController);
  });

  it("lists only the authenticated user's company", async () => {
    await controller.findAll({
      id: "user-1",
      name: "Admin Teste",
      email: "admin@example.com",
      companyId: "company-1",
      role: "ADMIN",
    });

    expect(companiesService.findAll).toHaveBeenCalledWith("company-1");
  });
});
