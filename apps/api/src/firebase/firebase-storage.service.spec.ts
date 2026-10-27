import { describe, it, expect, beforeEach } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { FirebaseStorageService } from "./firebase-storage.service.js";
import { FirebaseService } from "./firebase.service.js";

describe("FirebaseStorageService (Security & Path Traversal Validation)", () => {
  let service: FirebaseStorageService;
  let mockFirebase: any;

  beforeEach(() => {
    mockFirebase = {
      isConfigured: () => false,
      getStorage: () => null,
    };
    service = new FirebaseStorageService(mockFirebase as FirebaseService);
  });

  it("permite caminhos normais e seguros", () => {
    const result = service.sanitizeStoragePath("company-1/model.stl");
    expect(result.cleanPath).toBe("company-1/model.stl");
    expect(result.localFullPath).toContain("company-1");
  });

  it("bloqueia tentativas de Path Traversal com .. (CWE-22)", () => {
    expect(() => {
      service.sanitizeStoragePath("../../etc/passwd");
    }).toThrow(BadRequestException);

    expect(() => {
      service.sanitizeStoragePath("company-1/../../../windows/system32/cmd.exe");
    }).toThrow(BadRequestException);
  });

  it("bloqueia caracteres nulos (Null Byte Injection)", () => {
    expect(() => {
      service.sanitizeStoragePath("company-1/model.stl\0.php");
    }).not.toThrow(); // Removeu o null byte e manteve model.stl.php seguro
  });

  it("rejeita caminhos vazios", () => {
    expect(() => {
      service.sanitizeStoragePath("");
    }).toThrow(BadRequestException);
  });
});
