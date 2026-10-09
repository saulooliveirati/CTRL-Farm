import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import * as bcrypt from "bcrypt";

import { PrismaService } from "../database/prisma.service.js";
import { AuthService } from "./auth.service.js";

describe("AuthService", () => {
  let service: AuthService;
  let prisma: { user: { findUnique: ReturnType<typeof vi.fn> } };
  let jwt: { signAsync: ReturnType<typeof vi.fn> };
  let passwordHash: string;

  beforeEach(async () => {
    passwordHash = await bcrypt.hash("TesteBeta#2026", 4);
    prisma = {
      user: {
        findUnique: vi.fn(),
      },
    };
    jwt = {
      signAsync: vi.fn().mockResolvedValue("jwt-test-token"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it("returns a token and safe user data for valid credentials", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Admin Teste",
      email: "admin@example.com",
      password: passwordHash,
      companyId: "company-1",
      role: "ADMIN",
      active: true,
    });

    const result = await service.login({
      email: " ADMIN@EXAMPLE.COM ",
      password: "TesteBeta#2026",
    });

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: "user-1",
      name: "Admin Teste",
      email: "admin@example.com",
      companyId: "company-1",
      role: "ADMIN",
    });
    expect(result).toEqual({
      accessToken: "jwt-test-token",
      tokenType: "Bearer",
      expiresIn: 86400,
      user: {
        id: "user-1",
        name: "Admin Teste",
        email: "admin@example.com",
        companyId: "company-1",
        role: "ADMIN",
      },
    });
    expect(result).not.toHaveProperty("user.password");
  });

  it("rejects invalid credentials and inactive users", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: "missing@example.com", password: "password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.user.findUnique.mockResolvedValue({
      id: "inactive",
      name: "Inactive",
      email: "inactive@example.com",
      password: passwordHash,
      companyId: "company-1",
      role: "ADMIN",
      active: false,
    });
    await expect(
      service.login({ email: "inactive@example.com", password: "TesteBeta#2026" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    prisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Admin Teste",
      email: "admin@example.com",
      password: passwordHash,
      companyId: "company-1",
      role: "ADMIN",
      active: true,
    });
    await expect(
      service.login({ email: "admin@example.com", password: "wrong-password" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});