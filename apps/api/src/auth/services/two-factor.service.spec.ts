import { BadRequestException } from "@nestjs/common";
import { createHmac } from "node:crypto";
import { TwoFactorService } from "./two-factor.service.js";

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(str: string): Buffer {
  const clean = str.replace(/=+$/, "").toUpperCase().replace(/\s+/g, "");
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const val = B32_ALPHABET.indexOf(clean[i]!);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function calculateTOTP(secret: string): string {
  const key = base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter), 0);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const binary =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(binary % 1000000).padStart(6, "0");
}

describe("TwoFactorService", () => {
  let service: TwoFactorService;

  beforeEach(() => {
    service = new TwoFactorService();
    service.onModuleInit();
  });

  it("returns unconfigured status for a new user", () => {
    const status = service.getStatus("user-clean");
    expect(status.enabled).toBe(false);
    expect(status.remainingBackupCodes).toBe(0);
    expect(service.isEnabled("user-clean")).toBe(false);
  });

  it("initiates setup, verifies code and activates 2FA", async () => {
    const setup = await service.setup("user-flow-1", "user@farm.com");
    expect(setup.secret).toHaveLength(32);
    expect(setup.qrCode).toMatch(/^data:image\/png;base64,/);
    expect(setup.backupCodes).toHaveLength(6);

    // Tentativa com código inválido falha
    expect(() => service.enable("user-flow-1", "999999")).toThrow(BadRequestException);

    // Código TOTP correto ativa
    const validCode = calculateTOTP(setup.secret);
    const result = service.enable("user-flow-1", validCode);
    expect(result.enabled).toBe(true);
    expect(result.remainingBackupCodes).toBe(6);
    expect(service.isEnabled("user-flow-1")).toBe(true);

    // Validação de código TOTP em login
    const verifyTotp = service.verifyCode("user-flow-1", validCode);
    expect(verifyTotp.valid).toBe(true);
    expect(verifyTotp.usedBackupCode).toBe(false);

    // Validação com código de recuperação reserva
    const backupCode = setup.backupCodes[0]!;
    const verifyBackup = service.verifyCode("user-flow-1", backupCode);
    expect(verifyBackup.valid).toBe(true);
    expect(verifyBackup.usedBackupCode).toBe(true);

    // O mesmo código de backup não pode ser reutilizado
    const reVerifyBackup = service.verifyCode("user-flow-1", backupCode);
    expect(reVerifyBackup.valid).toBe(false);

    // Status deve refletir 5 códigos restantes
    const status = service.getStatus("user-flow-1");
    expect(status.remainingBackupCodes).toBe(5);

    // Desativação
    const disableResult = service.disable("user-flow-1");
    expect(disableResult.enabled).toBe(false);
    expect(service.isEnabled("user-flow-1")).toBe(false);
  });
});
