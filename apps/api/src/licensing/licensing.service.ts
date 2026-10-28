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
   * Avalia as regras de sincronização da chave de ativação para cada cliente isoladamente
   */
  async evaluateValidationSchedule() {
    try {
      const activeLicenses = await this.prisma.userLicense.findMany({
        where: {
          activationKey: { not: "" },
          status: { in: ["ACTIVE", "SUSPENDED", "PAUSED", "EXPIRED"] },
        },
        include: { user: true },
      });

      if (!activeLicenses || activeLicenses.length === 0) {
        return;
      }

      const now = new Date();

      for (const lic of activeLicenses) {
        try {
          const expiresAt = new Date(lic.expiresAt);
          const lastValidated = lic.lastValidatedAt
            ? new Date(lic.lastValidatedAt)
            : new Date(lic.createdAt);

          const daysSinceLastValidation = (now.getTime() - lastValidated.getTime()) / (1000 * 60 * 60 * 24);
          const isLocked =
            lic.status === "SUSPENDED" ||
            lic.status === "SUSPENSO" ||
            lic.status === "PAUSED" ||
            lic.status === "PAUSADO";

          const isDueDateReached =
            now >= expiresAt ||
            (now.getFullYear() === expiresAt.getFullYear() &&
              now.getMonth() === expiresAt.getMonth() &&
              now.getDate() === expiresAt.getDate());

          const is15DaysCycleReached = daysSinceLastValidation >= 15;

          if (isDueDateReached || is15DaysCycleReached || isLocked) {
            this.logger.log(
              `Sincronizando licença ${lic.activationKey} (Empresa: ${lic.companyId || lic.userId}). Motivo: DueDate=${isDueDateReached}, 15Days=${is15DaysCycleReached}, Locked=${isLocked}`
            );
            if (lic.user) {
              await this.getStatus(lic.user as any, true);
            }
          }
        } catch (licErr: any) {
          this.logger.warn(`Erro ao sincronizar licença individual ${lic.activationKey}: ${licErr.message}`);
        }
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
    if (!cleanKey) {
      this.logger.warn("Comando de sincronização remota ignorado: activationKey vazia.");
      return {
        success: false,
        message: "Chave de ativação é obrigatória para sincronização remota.",
      };
    }

    const action = dto.action ? dto.action.toUpperCase() : (dto.status === "SUSPENDED" ? "SUSPEND" : "SYNC");
    const normalizedStatus =
      dto.status === "SUSPENSO" || dto.status === "SUSPENDED" || action === "SUSPEND"
        ? "SUSPENDED"
        : dto.status === "ATIVO" || dto.status === "ACTIVE" || action === "ACTIVATE"
        ? "ACTIVE"
        : dto.status;

    if (normalizedStatus === "SUSPENDED") {
      this.logger.warn(
        `🚨 NOTIFICAÇÃO IMEDIATA DO ADM GERENTE: Suspensão do serviço recebida para a chave: ${cleanKey}. Motivo: ${dto.reason || "Assinatura suspensa"}`
      );
    } else {
      this.logger.log(
        `✅ NOTIFICAÇÃO IMEDIATA DO ADM GERENTE: Reativação/atualização recebida para a chave: ${cleanKey}. Status: ${normalizedStatus}`
      );
    }

    const updateData: any = {
      status: normalizedStatus,
      lastValidatedAt: new Date(),
    };
    if (dto.expiresAt) {
      updateData.expiresAt = new Date(dto.expiresAt);
    }

    // 1. Atualiza no Banco de Dados estritamente para a chave correspondente
    await this.prisma.userLicense.updateMany({
      where: { activationKey: cleanKey },
      data: updateData,
    });

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
    // Multi-tenant: cada empresa/usuário possui sua própria licença isolada no banco PostgreSQL
  }

  private saveLicenseToCache(license: CachedLicense) {
    // Multi-tenant: cada empresa/usuário possui sua própria licença isolada no banco PostgreSQL
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

    if (!user?.id) {
      throw new BadRequestException("Usuário autenticado obrigatório para ativação da licença.");
    }

    try {
      let data: any = null;

      // 1. Tenta comunicação direta com o ADM Gerente
      try {
        const response = await fetch(`${this.admApiUrl}/licenses/activate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            activationKey: cleanKey,
            hardwareFingerprint: hardwareFingerprint || "HW-CTRL-FARM-CLIENT",
            clientVersion: "v2.5.0",
          }),
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          data = await response.json();
        } else {
          this.logger.warn(`ADM retornou status ${response.status} ao ativar ${cleanKey}. Tentando Firestore...`);
        }
      } catch (admFetchErr: any) {
        this.logger.warn(`Falha na chamada HTTP ao ADM Gerente: ${admFetchErr.message}. Tentando Firestore...`);
      }

      // 2. Fallback de Alta Disponibilidade: Consulta no Firebase Firestore se o ADM estiver offline/fechado
      if (!data) {
        const fbLicense = await this.fetchLicenseFromFirebase(cleanKey);
        if (fbLicense && fbLicense.rsaSignature) {
          this.logger.log(`[Firebase Licensing] Licença ${cleanKey} recuperada diretamente do Firestore.`);
          data = {
            activationKey: fbLicense.activationKey || cleanKey,
            clientId: fbLicense.clientId,
            clientName: fbLicense.clientName,
            client: {
              id: fbLicense.clientId,
              name: fbLicense.clientName,
              email: fbLicense.email || "",
            },
            plan: {
              code: fbLicense.planCode,
              name: fbLicense.planName || fbLicense.planCode,
              maxUsers: fbLicense.maxUsers || 10,
              maxPrinters: fbLicense.maxPrinters || 50,
            },
            planCode: fbLicense.planCode,
            features: fbLicense.allowedFeatures || fbLicense.features || {},
            issuedAt: fbLicense.issuedAt || new Date().toISOString(),
            expiresAt: fbLicense.expiresAt,
            rsaSignature: fbLicense.rsaSignature,
          };
        }
      }

      if (!data) {
        throw new BadRequestException(
          "Chave de ativação inválida ou não encontrada. Verifique a chave ou aguarde a aprovação no Sistema ADM Gerente.",
        );
      }

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
        this.logger.error("Assinatura RSA do payload retornado pelo ADM/Firebase é INVÁLIDA!");
        throw new BadRequestException(
          "A assinatura criptográfica RSA da chave fornecida é inválida. Chave não autorizada pelo Sistema ADM Gerente.",
        );
      }

      // Associa a licença no banco de dados do CTRL-Farm vinculada estritamente ao usuário/empresa
      const targetUserId = user.id;

      await this.prisma.userLicense.upsert({
        where: { userId: targetUserId },
        create: {
          userId: targetUserId,
          companyId: user.companyId || null,
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
          companyId: user.companyId || null,
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
   * Consulta o status da licença do usuário conectado (Isolamento Multi-tenant Estrito)
   */
  async getStatus(user?: AuthenticatedUser, forceOnlineCheck: boolean = false) {
    if (!user?.id && !user?.companyId) {
      return {
        isLicensed: false,
        isSuspended: false,
        mode: "OFFLINE_CACHE",
        status: "UNLICENSED",
        message: "Nenhum usuário autenticado.",
        daysRemaining: 0,
        license: null,
      };
    }

    let dbLicense = null;

    if (user.id) {
      dbLicense = await this.prisma.userLicense.findUnique({
        where: { userId: user.id },
      });
    }

    // Se o usuário não tiver licença própria direta, procura pela empresa dele
    if (!dbLicense && user.companyId) {
      dbLicense = await this.prisma.userLicense.findFirst({
        where: { companyId: user.companyId },
        orderBy: { createdAt: "desc" },
      });
    }

    // Se o usuário está autenticado e não tem licença ou a licença está pendente/sem chave
    if (!dbLicense || dbLicense.status === "PENDING_ACTIVATION" || !dbLicense.activationKey) {
      // 1. Verifica no Firestore se o cadastro foi aprovado e a chave já foi emitida pelo ADM Gerente
      try {
        const firestore = this.firebase.getFirestore();
        if (firestore) {
          let pendingDoc = null;
          if (user.companyId) {
            const snap = await firestore.collection("pending_registrations").doc(user.companyId).get();
            if (snap.exists) pendingDoc = snap.data();
          }
          if (!pendingDoc && user.email) {
            const snap = await firestore.collection("pending_registrations").doc(user.email).get();
            if (snap.exists) pendingDoc = snap.data();
          }

          if (pendingDoc && pendingDoc.status === "APPROVED" && pendingDoc.activationKey) {
            this.logger.log(
              `[Auto-Activate] Cadastro aprovado encontrado no Firestore para ${user.email}. Ativando chave ${pendingDoc.activationKey}...`,
            );
            await this.activateLicense(pendingDoc.activationKey, user);
            dbLicense = await this.prisma.userLicense.findUnique({
              where: { userId: user.id },
            });
          }
        }
      } catch (fbErr: any) {
        this.logger.warn(`Erro ao verificar pendência no Firebase para ${user.email}: ${fbErr.message}`);
      }

      // Se após a consulta ainda estiver sem chave ou pendente de ativação:
      if (!dbLicense || dbLicense.status === "PENDING_ACTIVATION" || !dbLicense.activationKey) {
        return {
          isLicensed: false,
          isSuspended: false,
          mode: "PENDING_ACTIVATION",
          status: "PENDING_ACTIVATION",
          message: "Aguardando aprovação do cadastro e registro da chave de ativação pelo Sistema ADM Gerente.",
          daysRemaining: 0,
          license: null,
        };
      }
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

    // Sem licença para este usuário/empresa
    return {
      isLicensed: false,
      isSuspended: false,
      mode: "OFFLINE_CACHE",
      status: "UNLICENSED",
      message: "Nenhuma licença ativa encontrada para este usuário/empresa. Insira uma chave de ativação para desbloquear os recursos.",
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
