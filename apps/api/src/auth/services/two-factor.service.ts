import { BadRequestException, Injectable, Logger, type OnModuleInit } from "@nestjs/common";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import QRCode from "qrcode";

export interface TwoFactorRecord {
  userId: string;
  enabled: boolean;
  secret: string;
  backupCodes: string[];
  pendingSecret?: string;
  pendingBackupCodes?: string[];
  createdAt?: string;
  updatedAt: string;
}

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = "";
  for (let i = 0; i < buffer.length; i++) {
    bits += buffer[i]!.toString(2).padStart(8, "0");
  }
  let encoded = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.substring(i, i + 5).padEnd(5, "0");
    encoded += B32_ALPHABET[Number.parseInt(chunk, 2)];
  }
  return encoded;
}

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

function generateTOTP(secret: string, counter: number): string {
  const key = base32Decode(secret);
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

function verifyTOTP(secret: string, code: string, window = 1): boolean {
  const cleanCode = code.replace(/\D/g, "").padStart(6, "0");
  if (cleanCode.length !== 6) return false;
  const currentStep = Math.floor(Date.now() / 1000 / 30);
  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, currentStep + i);
    if (expected === cleanCode) {
      return true;
    }
  }
  return false;
}

function hashBackupCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}

function generateBackupCodeString(): string {
  const bytes = randomBytes(4).toString("hex").toUpperCase();
  return `${bytes.slice(0, 4)}-${bytes.slice(4, 8)}`;
}

function resolveStoragePath(): string {
  if (process.env.CTRL_FARM_AUTH_STORAGE_DIR) {
    return resolve(process.env.CTRL_FARM_AUTH_STORAGE_DIR, "two-factor.json");
  }
  let curr = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = resolve(curr, "storage");
    if (existsSync(candidate)) {
      return resolve(candidate, "auth", "two-factor.json");
    }
    curr = dirname(curr);
  }
  return resolve(process.cwd(), "storage", "auth", "two-factor.json");
}

@Injectable()
export class TwoFactorService implements OnModuleInit {
  private readonly logger = new Logger(TwoFactorService.name);
  private records: Map<string, TwoFactorRecord> = new Map();
  private storageFilePath: string = "";

  onModuleInit() {
    this.storageFilePath = resolveStoragePath();
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (existsSync(this.storageFilePath)) {
        const raw = readFileSync(this.storageFilePath, "utf-8");
        const parsed = JSON.parse(raw) as Record<string, TwoFactorRecord>;
        this.records = new Map(Object.entries(parsed));
        this.logger.log(`Carregadas ${this.records.size} configurações 2FA do disco.`);
      }
    } catch (err) {
      this.logger.error("Erro ao carregar registros de 2FA do arquivo:", err);
    }
  }

  private saveToDisk() {
    try {
      const dir = dirname(this.storageFilePath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data: Record<string, TwoFactorRecord> = {};
      for (const [key, value] of this.records.entries()) {
        data[key] = value;
      }
      writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      this.logger.error("Erro ao salvar registros de 2FA no arquivo:", err);
    }
  }

  isEnabled(userId: string): boolean {
    const record = this.records.get(userId);
    return Boolean(record?.enabled && record.secret);
  }

  getStatus(userId: string) {
    const record = this.records.get(userId);
    const enabled = Boolean(record?.enabled && record.secret);
    return {
      enabled,
      createdAt: record?.createdAt ?? null,
      remainingBackupCodes: enabled ? (record?.backupCodes?.length ?? 0) : 0,
    };
  }

  async setup(userId: string, email: string) {
    const secretBuffer = randomBytes(20);
    const secret = base32Encode(secretBuffer);

    const backupCodes: string[] = [];
    for (let i = 0; i < 6; i++) {
      backupCodes.push(generateBackupCodeString());
    }

    const appName = "CTRL-Farm";
    const otpauthUri = `otpauth://totp/${encodeURIComponent(appName)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(appName)}&digits=6&period=30`;

    const qrCode = await QRCode.toDataURL(otpauthUri, {
      margin: 1,
      width: 256,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    const existing = this.records.get(userId);
    const entry: TwoFactorRecord = {
      userId,
      enabled: existing?.enabled ?? false,
      secret: existing?.secret ?? "",
      backupCodes: existing?.backupCodes ?? [],
      pendingSecret: secret,
      pendingBackupCodes: backupCodes,
      createdAt: existing?.createdAt,
      updatedAt: new Date().toISOString(),
    };

    this.records.set(userId, entry);
    this.saveToDisk();

    return {
      secret,
      otpauthUri,
      qrCode,
      backupCodes,
    };
  }

  enable(userId: string, code: string) {
    const entry = this.records.get(userId);
    if (!entry || !entry.pendingSecret) {
      throw new BadRequestException(
        "Nenhum processo de configuração 2FA foi iniciado. Solicite um novo QR Code.",
      );
    }

    const valid = verifyTOTP(entry.pendingSecret, code);
    if (!valid) {
      throw new BadRequestException(
        "Código de verificação incorreto ou expirado. Verifique a hora do seu celular e tente novamente.",
      );
    }

    const backupCodeHashes = (entry.pendingBackupCodes ?? []).map(hashBackupCode);

    entry.secret = entry.pendingSecret;
    entry.backupCodes = backupCodeHashes;
    entry.enabled = true;
    entry.createdAt = entry.createdAt ?? new Date().toISOString();
    entry.updatedAt = new Date().toISOString();
    delete entry.pendingSecret;
    delete entry.pendingBackupCodes;

    this.records.set(userId, entry);
    this.saveToDisk();

    return {
      success: true,
      enabled: true,
      remainingBackupCodes: entry.backupCodes.length,
      message: "Autenticação em duas etapas ativada com sucesso!",
    };
  }

  verifyCode(userId: string, code: string): { valid: boolean; usedBackupCode?: boolean } {
    const entry = this.records.get(userId);
    if (!entry || !entry.enabled || !entry.secret) {
      return { valid: false };
    }

    const cleanCode = code.trim();
    if (!cleanCode) return { valid: false };

    // 1. Tenta validar via TOTP (6 dígitos numéricos)
    if (/^\d{6}$/.test(cleanCode.replace(/\s+/g, ""))) {
      const isValidTotp = verifyTOTP(entry.secret, cleanCode);
      if (isValidTotp) {
        return { valid: true, usedBackupCode: false };
      }
    }

    // 2. Tenta validar via Código de Backup (formato XXXX-XXXX ou 8 caracteres alfanuméricos)
    const codeHash = hashBackupCode(cleanCode);
    const backupIndex = entry.backupCodes.indexOf(codeHash);
    if (backupIndex !== -1) {
      // Consome o código de recuperação para que só possa ser usado uma vez
      entry.backupCodes.splice(backupIndex, 1);
      entry.updatedAt = new Date().toISOString();
      this.records.set(userId, entry);
      this.saveToDisk();
      return { valid: true, usedBackupCode: true };
    }

    return { valid: false };
  }

  disable(userId: string) {
    this.records.delete(userId);
    this.saveToDisk();
    return {
      success: true,
      enabled: false,
      message: "Autenticação em duas etapas desativada com sucesso.",
    };
  }

  generateBackupCodes(userId: string) {
    const entry = this.records.get(userId);
    if (!entry || !entry.enabled) {
      throw new BadRequestException("2FA não está ativado para este usuário.");
    }

    const backupCodes: string[] = [];
    for (let i = 0; i < 6; i++) {
      backupCodes.push(generateBackupCodeString());
    }

    entry.backupCodes = backupCodes.map(hashBackupCode);
    entry.updatedAt = new Date().toISOString();
    this.records.set(userId, entry);
    this.saveToDisk();

    return {
      backupCodes,
      remainingBackupCodes: entry.backupCodes.length,
    };
  }
}
