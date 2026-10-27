import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

export function canonicalJsonStringify(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return "[" + obj.map(canonicalJsonStringify).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => JSON.stringify(k) + ":" + canonicalJsonStringify(obj[k]));
  return "{" + pairs.join(",") + "}";
}

export function buildLicenseCanonicalPayload(params: {
  activationKey: string;
  clientId: string;
  clientName: string;
  planCode: string;
  issuedAt: string;
  expiresAt: string;
  features: any;
}) {
  return canonicalJsonStringify({
    activationKey: params.activationKey,
    clientId: params.clientId,
    clientName: params.clientName,
    planCode: params.planCode,
    issuedAt: params.issuedAt,
    expiresAt: params.expiresAt,
    features: params.features,
  });
}

@Injectable()
export class RsaService implements OnModuleInit {
  private readonly logger = new Logger(RsaService.name);
  private privateKeyPem = "";
  private publicKeyPem = "";

  onModuleInit() {
    this.loadKeys();
  }

  private loadKeys() {
    try {
      const keysDir = path.resolve(process.cwd(), "keys");
      const privateKeyPath = path.join(keysDir, "adm_private.pem");
      const publicKeyPath = path.join(keysDir, "adm_public.pem");

      if (!fs.existsSync(privateKeyPath) || !fs.existsSync(publicKeyPath)) {
        // Fallback procurando relativo a sistema-adm-gerente
        const altKeysDir = path.resolve(process.cwd(), "sistema-adm-gerente", "keys");
        const altPrivatePath = path.join(altKeysDir, "adm_private.pem");
        const altPublicPath = path.join(altKeysDir, "adm_public.pem");

        if (fs.existsSync(altPrivatePath) && fs.existsSync(altPublicPath)) {
          this.privateKeyPem = fs.readFileSync(altPrivatePath, "utf8");
          this.publicKeyPem = fs.readFileSync(altPublicPath, "utf8");
          this.logger.log("Chaves RSA 4096-bit carregadas com sucesso de sistema-adm-gerente/keys.");
          return;
        }

        this.logger.warn("Chaves RSA não encontradas nos caminhos padrão. Gerando par de chaves 4096-bit...");
        fs.mkdirSync(keysDir, { recursive: true });
        const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
          modulusLength: 4096,
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });

        this.privateKeyPem = privateKey;
        this.publicKeyPem = publicKey;
        fs.writeFileSync(privateKeyPath, privateKey, "utf8");
        fs.writeFileSync(publicKeyPath, publicKey, "utf8");
        this.logger.log("Par de chaves RSA 4096-bit gerado com sucesso.");
        return;
      }

      this.privateKeyPem = fs.readFileSync(privateKeyPath, "utf8");
      this.publicKeyPem = fs.readFileSync(publicKeyPath, "utf8");
      this.logger.log("Chaves criptográficas RSA 4096-bit carregadas com sucesso.");
    } catch (err) {
      this.logger.error(`Erro ao carregar chaves RSA: ${err}`);
      throw err;
    }
  }

  /**
   * Gera uma chave de ativação no formato oficial: CTRL-FARM-XXXX-XXXX-XXXX
   */
  generateActivationKey(): string {
    const chunk = () => crypto.randomBytes(2).toString("hex").toUpperCase();
    return `CTRL-FARM-${chunk()}-${chunk()}-${chunk()}`;
  }

  /**
   * Assina digitalmente o payload da licença utilizando a chave privada RSA do ADM
   */
  signLicensePayload(payload: object | string): string {
    const data = Buffer.from(typeof payload === "string" ? payload : canonicalJsonStringify(payload));
    const sign = crypto.createSign("SHA256");
    sign.update(data);
    sign.end();
    return sign.sign(this.privateKeyPem, "base64");
  }

  /**
   * Valida a assinatura digital RSA utilizando a chave pública
   */
  verifyLicenseSignature(payload: object | string, signatureBase64: string): boolean {
    try {
      const data = Buffer.from(typeof payload === "string" ? payload : canonicalJsonStringify(payload));
      const verify = crypto.createVerify("SHA256");
      verify.update(data);
      verify.end();
      return verify.verify(this.publicKeyPem, signatureBase64, "base64");
    } catch (err) {
      this.logger.warn(`Falha na verificação de assinatura RSA: ${err}`);
      return false;
    }
  }

  getPublicKey(): string {
    return this.publicKeyPem;
  }
}
