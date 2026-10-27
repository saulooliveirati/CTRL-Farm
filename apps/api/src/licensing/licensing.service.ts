import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { PrismaService } from "../database/prisma.service.js";
import { FirebaseService } from "../firebase/firebase.service.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";

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

function buildLicenseCanonicalPayload(params: {
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

export interface CachedLicense {
  activationKey: string;
  client: {
    id: string;
    name: string;
    email: string;
    document?: string | null;
  };
  plan: {
    code: string;
    name: string;
    maxUsers: number;
    maxPrinters: number;
    maxCompanies?: number;
  };
  features: Record<string, any>;
  issuedAt: string;
  expiresAt: string;
  rsaSignature: string;
  lastValidatedAt: string;
  offlineGracePeriodDays: number;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "UNLICENSED";
}

@Injectable()
export class LicensingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LicensingService.name);
  private publicKeyPem: string = "";
  private cacheFilePath: string = "";
  private currentLicense: CachedLicense | null = null;
  private admApiUrl: string = process.env.ADM_API_URL || "http://localhost:4001/api/v1";
  private syncCheckTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService,
  ) {}

  /**
   * Consulta a chave de ativação diretamente no Firebase Firestore para validação de alta disponibilidade
   */
  async fetchLicenseFromFirebase(activationKey: string): Promise<any | null> {
    const firestore = this.firebase.getFirestore();
    if (!firestore) return null;

    try {
      const cleanKey = activationKey.trim().toUpperCase();
      const docRef = firestore.collection("licenses").doc(cleanKey);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return null;
      }
      return snapshot.data();
    } catch (err: any) {
      this.logger.warn(
        `[Firebase Licensing] Erro ao consultar chave ${activationKey} no Firestore: ${err.message}`,
      );
      return null;
    }
  }

  onModuleInit() {
    this.initPaths();
    this.loadPublicKey();
    this.loadCachedLicense();
    this.scheduleLicensingValidation();
  }

  onModuleDestroy() {
    if (this.syncCheckTimer) {
      clearInterval(this.syncCheckTimer);
      this.syncCheckTimer = null;
    }
  }

  /**
   * Agenda a verificação inteligente de sincronização da chave de ativação:
   * 1. Sincronização periódica automática a cada 15 dias
   * 2. Sincronização automática na data de vencimento da chave para renovação com o ADM Gerente
   * 3. Revalidação a cada 15 minutos caso o sistema esteja suspenso para liberação ágil pós-pagamento
   */
  private scheduleLicensingValidation() {
    // Avaliação inicial 5 segundos após inicialização da API
    setTimeout(() => {
      this.evaluateValidationSchedule();
    }, 5000);

    // Avaliador inteligente a cada 15 minutos (verifica se atingiu ciclo de 15 dias, data de vencimento ou status suspenso)
    this.syncCheckTimer = setInterval(() => {
      this.evaluateValidationSchedule();
    }, 15 * 60 * 1000);

    this.logger.log(
      "Agendador de sincronização de licença ativado: Ciclo periódico a cada 15 dias e renovação automática na data de vencimento."
    );
  }

  /**
   * Avalia as regras de sincronização da chave de ativação
   */
  async evaluateValidationSchedule() {
    try {
      const dbLicense = await this.prisma.userLicense.findFirst({
        orderBy: { createdAt: "desc" },
      });

      const targetLicense = dbLicense || this.currentLicense;
      if (!targetLicense) {
        return;
      }

      const now = new Date();
      const expiresAt = new Date(targetLicense.expiresAt);
      const lastValidated = targetLicense.lastValidatedAt
        ? new Date(targetLicense.lastValidatedAt)
        : new Date("createdAt" in targetLicense ? targetLicense.createdAt : (targetLicense as any).issuedAt);

      const daysSinceLastValidation = (now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);
      const isLocked =
        targetLicense.status === "SUSPENDED" ||
        targetLicense.status === "SUSPENSO" ||
        targetLicense.status === "PAUSED" ||
        targetLicense.status === "PAUSADO";

      // 1. Data de vencimento atingida ou hoje é a data de renovação da chave
      const isDueDateReached =
        now >= expiresAt ||
        (now.getFullYear() === expiresAt.getFullYear() &&
          now.getMonth() === expiresAt.getMonth() &&
          now.getDate() === expiresAt.getDate());

      // 2. Ciclo periódico de 15 dias completado
      const is15DaysCycleReached = daysSinceLastValidation >= 15;

      if (isDueDateReached) {
        this.logger.log(
          `Data de vencimento da chave atingida (${expiresAt.toISOString().slice(0, 10)}). Executando validação automática para renovação com o Sistema ADM Gerente...`
        );
        const result = await this.getStatus(undefined, true);
        this.logger.log(`Validação de vencimento/renovação concluída: Status=${result?.status}, isLicensed=${result?.isLicensed}`);
      } else if (is15DaysCycleReached) {
        this.logger.log(
          `Ciclo periódico de 15 dias atingido (${daysSinceLastValidation.toFixed(1)} dias desde a última validação). Sincronizando licença com o Sistema ADM Gerente...`
        );
        const result = await this.getStatus(undefined, true);
        this.logger.log(`Sincronização periódica de 15 dias concluída: Status=${result?.status}, isLicensed=${result?.isLicensed}`);
      } else if (isLocked) {
        // Se estiver bloqueada/suspensa, tenta revalidar a cada 15 minutos para desbloqueio rápido
        this.logger.debug("Licença com status suspenso. Tentando revalidação junto ao Sistema ADM Gerente...");
        await this.getStatus(undefined, true);
      }
    } catch (err: any) {
      this.logger.warn(`Falha na avaliação agendada de validação de licença: ${err.message}`);
    }
  }

  /**
   * Aplica imediatamente uma notificação de suspensão ou reativação enviada pelo Sistema ADM Gerente
   */
  async applyRemoteLicenseStatus(dto: {
    activationKey: string;
    status: string;
    action?: string;
    reason?: string;
    expiresAt?: string;
  }) {
    const cleanKey = dto.activationKey ? dto.activationKey.trim().toUpperCase() : "";
    const action = dto.action ? dto.action.toUpperCase() : (dto.status === "SUSPENDED" ? "SUSPEND" : "SYNC");
    const normalizedStatus =
      dto.status === "SUSPENSO" || dto.status === "SUSPENDED" || action === "SUSPEND"
        ? "SUSPENDED"
        : dto.status === "ATIVO" || dto.status === "ACTIVE" || action === "ACTIVATE"
        ? "ACTIVE"
        : dto.status;

    if (normalizedStatus === "SUSPENDED") {
      this.logger.warn(
        `🚨 NOTIFICAÇÃO IMEDIATA DO ADM GERENTE: Suspensão do serviço recebida para a chave: ${cleanKey || "GLOBAL"}. Motivo: ${dto.reason || "Assinatura suspensa"}`
      );
    } else {
      this.logger.log(
        `✅ NOTIFICAÇÃO IMEDIATA DO ADM GERENTE: Reativação/atualização recebida para a chave: ${cleanKey || "GLOBAL"}. Status: ${normalizedStatus}`
      );
    }

    const updateData: any = {
      status: normalizedStatus,
      lastValidatedAt: new Date(),
    };
    if (dto.expiresAt) {
      updateData.expiresAt = new Date(dto.expiresAt);
    }

    // 1. Atualiza no Banco de Dados
    if (cleanKey) {
      await this.prisma.userLicense.updateMany({
        where: { activationKey: cleanKey },
        data: updateData,
      });
    } else {
      await this.prisma.userLicense.updateMany({
        data: updateData,
      });
    }

    // 2. Atualiza no Cache em Disco e Memória
    if (this.currentLicense && (!cleanKey || this.currentLicense.activationKey === cleanKey)) {
      this.currentLicense.status = normalizedStatus as any;
      this.currentLicense.lastValidatedAt = new Date().toISOString();
      if (dto.expiresAt) {
        this.currentLicense.expiresAt = dto.expiresAt;
      }
      this.saveLicenseToCache(this.currentLicense);
    }

    return {
      success: true,
      applied: true,
      action,
      status: normalizedStatus,
      activationKey: cleanKey,
      timestamp: new Date().toISOString(),
      message:
        normalizedStatus === "SUSPENDED"
          ? "Serviço suspenso imediatamente conforme comando do Sistema ADM Gerente."
          : "Serviço reativado e licença sincronizada com sucesso.",
    };
  }

  private initPaths() {
    const storageDir = path.resolve(process.cwd(), "storage");
    if (!fs.existsSync(storageDir)) {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch (e) {
        // ignore
      }
    }
    this.cacheFilePath = path.join(storageDir, "license-cache.json");
  }

  private loadPublicKey() {
    try {
      const possiblePaths = [
        path.resolve(process.cwd(), "src/licensing/keys/adm_public.pem"),
        path.resolve(process.cwd(), "apps/api/src/licensing/keys/adm_public.pem"),
        path.resolve(process.cwd(), "keys/adm_public.pem"),
        path.resolve(process.cwd(), "sistema-adm-gerente/keys/adm_public.pem"),
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          this.publicKeyPem = fs.readFileSync(p, "utf8");
          this.logger.log(`Chave pública RSA carregada de: ${p}`);
          return;
        }
      }

      this.logger.warn("Chave pública RSA do ADM não encontrada nos caminhos padrão.");
    } catch (err) {
      this.logger.error(`Erro ao carregar chave pública RSA: ${err}`);
    }
  }

  private loadCachedLicense() {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, "utf8");
        this.currentLicense = JSON.parse(raw);
        this.logger.log(
          `Licença carregada do cache local: Plano ${this.currentLicense?.plan?.name} (${this.currentLicense?.activationKey})`
        );
      }
    } catch (err) {
      this.logger.warn(`Falha ao ler cache de licença: ${err}`);
      this.currentLicense = null;
    }
  }

  private saveLicenseToCache(license: CachedLicense) {
    try {
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(license, null, 2), "utf8");
      this.currentLicense = license;
    } catch (err) {
      this.logger.error(`Erro ao salvar cache de licença: ${err}`);
    }
  }

  public verifySignature(payload: string | object, signatureBase64: string): boolean {
    if (!this.publicKeyPem) {
      this.logger.error("Chave pública RSA indisponível para verificação.");
      return false;
    }
    try {
      const data = Buffer.from(typeof payload === "string" ? payload : canonicalJsonStringify(payload));
      const verifier = crypto.createVerify("SHA256");
      verifier.update(data);
      verifier.end();
      return verifier.verify(this.publicKeyPem, signatureBase64, "base64");
    } catch (err) {
      this.logger.warn(`Erro na verificação de assinatura RSA: ${err}`);
      return false;
    }
  }

  /**
   * Ativa uma nova chave de licença associada ao usuário / empresa
   */
  async activateLicense(
    activationKey: string,
    user?: AuthenticatedUser,
    hardwareFingerprint?: string,
  ): Promise<any> {
    const cleanKey = activationKey.trim().toUpperCase();
    this.logger.log(`Tentando ativar licença: ${cleanKey} para usuário: ${user?.email || "Geral"}`);

    try {
      const response = await fetch(`${this.admApiUrl}/licenses/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activationKey: cleanKey,
          hardwareFingerprint: hardwareFingerprint || "HW-CTRL-FARM-CLIENT",
          clientVersion: "v2.5.0",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BadRequestException(
          errorData.message || `Falha na ativação junto ao ADM Gerente (Status ${response.status})`
        );
      }

      const data = await response.json();

      // Reconstrói o payload canônico para validação da assinatura RSA
      const canonicalPayload = buildLicenseCanonicalPayload({
        activationKey: data.activationKey,
        clientId: data.clientId || data.client?.id,
        clientName: data.clientName || data.client?.name,
        planCode: data.planCode || data.plan?.code,
        issuedAt: new Date(data.issuedAt).toISOString(),
        expiresAt: new Date(data.expiresAt).toISOString(),
        features: data.features,
      });

      const isSignatureValid = this.verifySignature(canonicalPayload, data.rsaSignature);
      if (!isSignatureValid) {
        this.logger.error("Assinatura RSA do payload retornado pelo ADM é INVÁLIDA!");
        throw new BadRequestException(
          "A assinatura criptográfica RSA da chave fornecida é inválida. Chave não autorizada pelo Sistema ADM Gerente."
        );
      }

      const cached: CachedLicense = {
        activationKey: data.activationKey,
        client: data.client,
        plan: data.plan,
        features: data.features,
        issuedAt: data.issuedAt,
        expiresAt: data.expiresAt,
        rsaSignature: data.rsaSignature,
        lastValidatedAt: new Date().toISOString(),
        offlineGracePeriodDays: 15,
        status: "ACTIVE",
      };

      this.saveLicenseToCache(cached);

      // Associa a licença no banco de dados do CTRL-Farm vinculada ao usuário
      let targetUserId = user?.id;
      if (!targetUserId) {
        const firstUser = await this.prisma.user.findFirst();
        if (firstUser) targetUserId = firstUser.id;
      }

      if (targetUserId) {
        await this.prisma.userLicense.upsert({
          where: { userId: targetUserId },
          create: {
            userId: targetUserId,
            companyId: user?.companyId || null,
            activationKey: data.activationKey,
            planCode: data.plan.code,
            planName: data.plan.name,
            status: "ACTIVE",
            expiresAt: new Date(data.expiresAt),
            allowedFeatures: data.features,
            rsaSignature: data.rsaSignature,
            lastValidatedAt: new Date(),
            autoUpdate: true,
          },
          update: {
            companyId: user?.companyId || null,
            activationKey: data.activationKey,
            planCode: data.plan.code,
            planName: data.plan.name,
            status: "ACTIVE",
            expiresAt: new Date(data.expiresAt),
            allowedFeatures: data.features,
            rsaSignature: data.rsaSignature,
            lastValidatedAt: new Date(),
          },
        });
      }

      return {
        success: true,
        message: `Licença do Plano ${data.plan.name} ativada com sucesso para ${user?.name || "sua conta"}!`,
        license: {
          activationKey: data.activationKey,
          plan: data.plan,
          features: data.features,
          expiresAt: data.expiresAt,
          status: "ACTIVE",
        },
      };
    } catch (err: any) {
      this.logger.error(`Erro ao ativar licença: ${err.message}`);
      throw err;
    }
  }

  /**
   * Consulta o status da licença do usuário conectado (ou fallback do sistema)
   */
  /**
   * Consulta o status da licença do usuário conectado (ou fallback do sistema)
   */
  async getStatus(user?: AuthenticatedUser, forceOnlineCheck: boolean = false) {
    let dbLicense = null;

    if (user?.id) {
      dbLicense = await this.prisma.userLicense.findUnique({
        where: { userId: user.id },
      });

      // Se o usuário não tiver licença própria, procura pela empresa dele
      if (!dbLicense && user.companyId) {
        dbLicense = await this.prisma.userLicense.findFirst({
          where: { companyId: user.companyId },
          orderBy: { createdAt: "desc" },
        });
      }
    }

    if (!dbLicense) {
      dbLicense = await this.prisma.userLicense.findFirst({
        orderBy: { createdAt: "desc" },
      });
    }

    // Se temos licença no banco para o usuário/empresa
    if (dbLicense) {
      const now = new Date();
      let status = dbLicense.status;
      let onlineCheckSuccess = false;
      let lockReason = "";

      // Se for solicitado forceOnlineCheck ou se a licença estiver travada/suspensa/pausada/cancelada, valida com o ADM Gerente
      const isCurrentlyLocked =
        status === "SUSPENDED" ||
        status === "SUSPENSO" ||
        status === "PAUSED" ||
        status === "PAUSADO" ||
        status === "CANCELLED" ||
        status === "CANCELADO" ||
        status === "REVOKED";

      // 1. CONSULTA PRIORITÁRIA NO FIREBASE FIRESTORE (Desacoplamento e Alta Disponibilidade)
      // Toda chave criada, pausada, alterada (mudança de plano) ou cancelada no ADM é registrada no Firebase.
      // O CTRL-Farm consulta no Firebase, aplica a chave no sistema e realiza a ação definida.
      // Se o Sistema ADM estiver fechado ou sem conexão, o CTRL-Farm NÃO é afetado.
      try {
        const fbLicense = await this.fetchLicenseFromFirebase(dbLicense.activationKey);
        if (fbLicense) {
          onlineCheckSuccess = true;
          this.logger.log(
            `[Firebase Licensing] Chave ${dbLicense.activationKey} verificada no Firestore. Status: ${fbLicense.status}, Plano: ${fbLicense.planCode}`,
          );

          if (
            fbLicense.status === "PAUSED" ||
            fbLicense.status === "PAUSADO" ||
            fbLicense.status === "SUSPENDED" ||
            fbLicense.status === "SUSPENSO" ||
            fbLicense.status === "CANCELLED" ||
            fbLicense.status === "CANCELADO" ||
            fbLicense.status === "REVOKED" ||
            fbLicense.active === false
          ) {
            status = fbLicense.status;
            lockReason =
              fbLicense.suspendedReason ||
              `Acesso à chave de ativação foi ${fbLicense.status.toLowerCase()} no Firebase.`;
            if (dbLicense.status !== status) {
              await this.prisma.userLicense.update({
                where: { id: dbLicense.id },
                data: { status, lastValidatedAt: now },
              });
              if (this.currentLicense) {
                this.currentLicense.status = status as any;
                this.saveLicenseToCache(this.currentLicense);
              }
            }
          } else if (fbLicense.status === "ACTIVE" || fbLicense.active === true) {
            status = "ACTIVE";
            const updateFields: any = {
              status: "ACTIVE",
              lastValidatedAt: now,
            };

            let changed = false;
            if (fbLicense.planCode && fbLicense.planCode !== dbLicense.planCode) {
              updateFields.planCode = fbLicense.planCode;
              updateFields.planName = fbLicense.planName || fbLicense.planCode;
              changed = true;
            }
            if (fbLicense.allowedFeatures) {
              updateFields.allowedFeatures = fbLicense.allowedFeatures;
              changed = true;
            }
            if (fbLicense.expiresAt) {
              const fbExpires = new Date(fbLicense.expiresAt);
              if (fbExpires.getTime() !== new Date(dbLicense.expiresAt).getTime()) {
                updateFields.expiresAt = fbExpires;
                changed = true;
              }
            }

            if (dbLicense.status !== "ACTIVE" || changed) {
              await this.prisma.userLicense.update({
                where: { id: dbLicense.id },
                data: updateFields,
              });
              dbLicense.status = "ACTIVE";
              if (updateFields.planCode) dbLicense.planCode = updateFields.planCode;
              if (updateFields.planName) dbLicense.planName = updateFields.planName;
              if (updateFields.allowedFeatures) dbLicense.allowedFeatures = updateFields.allowedFeatures;
              if (updateFields.expiresAt) dbLicense.expiresAt = updateFields.expiresAt;
            }

            if (this.currentLicense) {
              this.currentLicense.status = "ACTIVE";
              this.currentLicense.lastValidatedAt = now.toISOString();
              if (fbLicense.planCode) {
                this.currentLicense.plan = {
                  ...this.currentLicense.plan,
                  code: fbLicense.planCode,
                  name: fbLicense.planName || fbLicense.planCode,
                  maxPrinters: fbLicense.maxPrinters ?? this.currentLicense.plan.maxPrinters,
                  maxCompanies: fbLicense.maxCompanies ?? this.currentLicense.plan.maxCompanies,
                };
              }
              if (fbLicense.allowedFeatures) {
                this.currentLicense.features = fbLicense.allowedFeatures;
              }
              if (fbLicense.expiresAt) {
                this.currentLicense.expiresAt = fbLicense.expiresAt;
              }
              this.saveLicenseToCache(this.currentLicense);
            }
          }
        }
      } catch (fbErr: any) {
        this.logger.warn(`[Firebase Licensing] Falha ao consultar Firestore: ${fbErr.message}`);
      }

      // 2. CONSULTA SECUNDÁRIA: Se Firebase não respondeu e forceOnlineCheck / isCurrentlyLocked estiver ativo, tenta ADM HTTP
      if (!onlineCheckSuccess && (forceOnlineCheck || isCurrentlyLocked)) {
        try {
          const admRes = await fetch(
            `${this.admApiUrl}/licenses/check-status/${encodeURIComponent(dbLicense.activationKey)}`,
            { cache: "no-store", signal: AbortSignal.timeout(4000) },
          );
          if (admRes.ok) {
            const admData = await admRes.json();
            if (admData.found) {
              onlineCheckSuccess = true;
              if (admData.isLocked || admData.isSuspended) {
                status = admData.lockType || "SUSPENDED";
                lockReason = admData.lockReason || "Acesso suspenso ou pausado no Sistema ADM.";
                if (dbLicense.status !== status) {
                  await this.prisma.userLicense.update({
                    where: { id: dbLicense.id },
                    data: { status, lastValidatedAt: now },
                  });
                }
              } else if (admData.licenseStatus === "ACTIVE") {
                status = "ACTIVE";
                const nowValidated = new Date();
                dbLicense.lastValidatedAt = nowValidated;
                await this.prisma.userLicense.update({
                  where: { id: dbLicense.id },
                  data: { status: "ACTIVE", lastValidatedAt: nowValidated },
                });
              }
            }
          }
        } catch (e: any) {
          this.logger.debug(
            `Servidor ADM Gerente inacessível/fechado: ${e.message}. Validado em modo resiliente via Firebase/Cache local.`,
          );
        }
      }

      // Verificação da tolerância offline de 15 dias caso não tenha ocorrido checagem online com sucesso agora
      const lastValidated = dbLicense.lastValidatedAt
        ? new Date(dbLicense.lastValidatedAt)
        : new Date(dbLicense.createdAt);
      const daysSinceValidation = (now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);
      const isToleranceExceeded = daysSinceValidation > 15;
      const offlineDaysRemaining = Math.max(0, Math.ceil(15 - daysSinceValidation));

      if (isToleranceExceeded && status === "ACTIVE") {
        this.logger.error(
          `Prazo limite de 15 dias sem validação com o ADM Gerente excedido (${daysSinceValidation.toFixed(1)} dias). Bloqueando licença.`
        );
        status = "SUSPENDED";
        lockReason =
          "Prazo limite de 15 dias sem validação de licença excedido. Conecte o CTRL-Farm à internet para sincronizar com o ADM Gerente.";
        await this.prisma.userLicense.update({
          where: { id: dbLicense.id },
          data: { status: "SUSPENDED" },
        });
      }

      const expiresAt = new Date(dbLicense.expiresAt);
      const isLocked =
        status === "SUSPENDED" ||
        status === "SUSPENSO" ||
        status === "PAUSED" ||
        status === "PAUSADO" ||
        status === "CANCELLED" ||
        status === "CANCELADO" ||
        status === "REVOKED";

      const isExpired = now > expiresAt && !isLocked;
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

      let features = dbLicense.allowedFeatures as any;
      let clientId = user?.companyId || dbLicense.companyId || "CLIENT";
      let clientName = user?.name || "USUARIO";
      let issuedAtStr = new Date(dbLicense.createdAt).toISOString();
      let expiresAtStr = expiresAt.toISOString();

      if (this.currentLicense?.activationKey === dbLicense.activationKey) {
        clientId = this.currentLicense.client?.id || clientId;
        clientName = this.currentLicense.client?.name || clientName;
        issuedAtStr = new Date(this.currentLicense.issuedAt).toISOString();
        expiresAtStr = new Date(this.currentLicense.expiresAt).toISOString();
        features = this.currentLicense.features;
      }

      // Validação de assinatura RSA
      const canonicalPayload = buildLicenseCanonicalPayload({
        activationKey: dbLicense.activationKey,
        clientId,
        clientName,
        planCode: dbLicense.planCode,
        issuedAt: issuedAtStr,
        expiresAt: expiresAtStr,
        features,
      });

      const isSignatureValid = this.verifySignature(canonicalPayload, dbLicense.rsaSignature);
      const finalStatus = isLocked
        ? status
        : isExpired
          ? "EXPIRED"
          : isSignatureValid
            ? status
            : "TAMPERED";

      const isLicensed = finalStatus === "ACTIVE";

      return {
        isLicensed,
        isSuspended: isLocked,
        mode: onlineCheckSuccess ? "ONLINE" : "OFFLINE_CACHE",
        status: finalStatus,
        message: isLocked
          ? lockReason ||
            (status === "PAUSED" || status === "PAUSADO"
              ? "Licença pausada temporariamente pelo administrador."
              : status === "CANCELLED" || status === "CANCELADO"
                ? "Assinatura cancelada no Sistema ADM."
                : status === "REVOKED"
                  ? "Chave de licença revogada."
                  : "Assinatura suspensa por pagamento pendente.")
          : isExpired
            ? "Sua assinatura expirou. Renove sua chave para continuar utilizando todos os recursos."
            : onlineCheckSuccess
              ? `Assinatura ${dbLicense.planName} ativa (${daysRemaining} dias restantes).`
              : `Licença ativa em modo offline (${offlineDaysRemaining} dias restantes para validação obrigatória).`,
        daysRemaining,
        license: {
          activationKey: dbLicense.activationKey,
          plan: {
            code: dbLicense.planCode,
            name: dbLicense.planName,
          },
          features: dbLicense.allowedFeatures as Record<string, any>,
          expiresAt: dbLicense.expiresAt.toISOString(),
          lastValidatedAt: dbLicense.lastValidatedAt?.toISOString() || null,
          autoUpdate: dbLicense.autoUpdate,
          updateChannel: dbLicense.updateChannel,
        },
      };
    }

    // Fallback para cache local se ainda não há licença no banco
    if (this.currentLicense) {
      let onlineCheckSuccess = false;
      let lockReason = "";
      const now = new Date();
      let status = (this.currentLicense as any).status || "ACTIVE";

      const isCurrentlyLocked =
        status === "SUSPENDED" ||
        status === "SUSPENSO" ||
        status === "PAUSED" ||
        status === "PAUSADO" ||
        status === "CANCELLED" ||
        status === "CANCELADO" ||
        status === "REVOKED";

      if (forceOnlineCheck || isCurrentlyLocked) {
        try {
          const admRes = await fetch(
            `${this.admApiUrl}/licenses/check-status/${encodeURIComponent(this.currentLicense.activationKey)}`,
            { cache: "no-store", signal: AbortSignal.timeout(6000) }
          );
          if (admRes.ok) {
            const admData = await admRes.json();
            if (admData.found) {
              onlineCheckSuccess = true;
              if (admData.isLocked || admData.isSuspended) {
                status = admData.lockType || "SUSPENDED";
                lockReason = admData.lockReason || "Licença bloqueada no Sistema ADM.";
                (this.currentLicense as any).status = status;
                this.saveLicenseToCache(this.currentLicense);
              } else if (admData.licenseStatus === "ACTIVE") {
                status = "ACTIVE";
                (this.currentLicense as any).status = "ACTIVE";
                this.currentLicense.lastValidatedAt = now.toISOString();
                this.saveLicenseToCache(this.currentLicense);
              }
            }
          }
        } catch (e: any) {
          this.logger.warn(`Falha na checagem online com o ADM Gerente: ${e.message}`);
        }
      }

      // Tolerância offline 15 dias no cache
      const lastValidated = this.currentLicense.lastValidatedAt
        ? new Date(this.currentLicense.lastValidatedAt)
        : new Date(this.currentLicense.issuedAt);
      const daysSinceValidation = (now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);
      const isToleranceExceeded = daysSinceValidation > 15;
      const offlineDaysRemaining = Math.max(0, Math.ceil(15 - daysSinceValidation));

      if (isToleranceExceeded && status === "ACTIVE") {
        this.logger.error(`Prazo de 15 dias sem validação com o ADM Gerente excedido no cache local. Bloqueando.`);
        status = "SUSPENDED";
        lockReason =
          "Prazo limite de 15 dias sem validação de licença excedido. Conecte o CTRL-Farm à internet para sincronizar com o ADM Gerente.";
        (this.currentLicense as any).status = "SUSPENDED";
        this.saveLicenseToCache(this.currentLicense);
      }

      const expiresAt = new Date(this.currentLicense.expiresAt);
      const isLocked =
        status === "SUSPENDED" ||
        status === "SUSPENSO" ||
        status === "PAUSED" ||
        status === "PAUSADO" ||
        status === "CANCELLED" ||
        status === "CANCELADO" ||
        status === "REVOKED";

      const isExpired = now > expiresAt && !isLocked;
      const daysRemaining = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const isLicensed = !isExpired && !isLocked && status === "ACTIVE";

      return {
        isLicensed,
        isSuspended: isLocked,
        mode: onlineCheckSuccess ? "ONLINE" : "OFFLINE_CACHE",
        status: isLocked ? status : isExpired ? "EXPIRED" : status,
        message: isLocked
          ? lockReason ||
            (status === "PAUSED" || status === "PAUSADO"
              ? "Licença pausada temporariamente pelo administrador."
              : status === "CANCELLED" || status === "CANCELADO"
                ? "Assinatura cancelada no Sistema ADM."
                : status === "REVOKED"
                  ? "Chave de licença revogada."
                  : "Assinatura suspensa por pagamento pendente.")
          : isExpired
            ? "Sua licença local expirou."
            : onlineCheckSuccess
              ? `Licença local ${this.currentLicense.plan.name} ativa.`
              : `Licença local operando em modo offline (${offlineDaysRemaining} dias restantes para validação obrigatória).`,
        daysRemaining,
        license: {
          activationKey: this.currentLicense.activationKey,
          plan: this.currentLicense.plan,
          features: this.currentLicense.features,
          expiresAt: this.currentLicense.expiresAt,
          lastValidatedAt: this.currentLicense.lastValidatedAt,
          autoUpdate: true,
          updateChannel: "STABLE",
        },
      };
    }

    // Sem licença
    return {
      isLicensed: false,
      isSuspended: false,
      mode: "OFFLINE_CACHE",
      status: "UNLICENSED",
      message: "Nenhuma licença ativa encontrada. Insira uma chave de ativação para desbloquear os recursos.",
      daysRemaining: 0,
      license: null,
    };
  }

  /**
   * Força a revalidação da assinatura e pagamento junto ao ADM Gerente
   */
  async revalidateSubscription(user?: AuthenticatedUser) {
    return this.getStatus(user, true);
  }

  /**
   * Atualiza preferência de atualização automática do usuário
   */
  async updateAutoUpdatePreference(userId: string, autoUpdate: boolean, updateChannel?: string) {
    if (!userId) return null;
    return this.prisma.userLicense.updateMany({
      where: { userId },
      data: {
        autoUpdate,
        ...(updateChannel ? { updateChannel } : {}),
      },
    });
  }

  /**
   * Consulta o Sistema ADM Gerente para saber se há novas versões disponíveis
   */
  async checkForUpdates(currentVersion: string = "v2.5.0") {
    try {
      const response = await fetch(
        `${this.admApiUrl}/updates/check?version=${encodeURIComponent(currentVersion)}`,
      );
      if (!response.ok) {
        throw new Error(`Falha ao consultar servidor ADM (Status ${response.status})`);
      }
      return await response.json();
    } catch (err: any) {
      return {
        updateAvailable: false,
        error: err.message,
        message: "Não foi possível conectar ao servidor de atualizações no momento.",
      };
    }
  }

  /**
   * Verificação de permissão de recurso conforme o nível de assinatura ativo
   */
  async checkFeatureAccess(user?: AuthenticatedUser, featureKey?: string): Promise<boolean> {
    const status = await this.getStatus(user);
    if (!status.isLicensed) return false;
    if (status.license?.plan?.code === "UNLIMITED_OWNER" || status.license?.plan?.code === "ENTERPRISE") {
      return true;
    }
    if (!featureKey) return true;
    return Boolean(status.license?.features?.[featureKey]);
  }
}
