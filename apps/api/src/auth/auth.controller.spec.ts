import { Test, TestingModule } from "@nestjs/testing";

import { AuthService } from "./auth.service.js";
import { AuthController } from "./auth.controller.js";
import { RegisterService } from "./services/register.service.js";
import { TwoFactorService } from "./services/two-factor.service.js";

describe("AuthController", () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: { login: vi.fn(), verifyUserPassword: vi.fn() } },
        { provide: RegisterService, useValue: { register: vi.fn() } },
        {
          provide: TwoFactorService,
          useValue: {
            getStatus: vi.fn(),
            setup: vi.fn(),
            enable: vi.fn(),
            disable: vi.fn(),
            generateBackupCodes: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
