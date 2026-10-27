import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service.js";
import type { RecordConsentDto } from "./dto/lgpd.dto.js";

export interface ConsentLogItem {
  id: string;
  companyId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  termVersion: string;
  accepted: boolean;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

@Injectable()
export class LgpdService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(companyId: string, userId: string) {
    const records = await this.prisma.$queryRawUnsafe<ConsentLogItem[]>(
      `SELECT * FROM "LgpdConsentLog"
       WHERE "companyId" = $1 AND "userId" = $2
       ORDER BY "createdAt" DESC LIMIT 1`,
      companyId,
      userId,
    );

    const latest = records[0];
    return {
      accepted: latest ? latest.accepted : true,
      termVersion: latest ? latest.termVersion : "1.0",
      acceptedAt: latest ? latest.createdAt : null,
      dpoContact: "dpo@ctrlfarm.com.br",
      legalBasis:
        "Art. 7º, Inciso V (Execução de contrato) e Inciso II (Cumprimento de obrigação legal) da Lei 13.709/2018 (LGPD).",
    };
  }

  async recordConsent(
    companyId: string,
    userId: string,
    userName: string,
    userEmail: string,
    dto: RecordConsentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "LgpdConsentLog" ("id", "companyId", "userId", "userName", "userEmail", "termVersion", "accepted", "ipAddress", "userAgent", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      id,
      companyId,
      userId,
      userName,
      userEmail,
      dto.termVersion,
      dto.accepted,
      ipAddress || null,
      userAgent || null,
    );

    return {
      success: true,
      id,
      accepted: dto.accepted,
      termVersion: dto.termVersion,
      timestamp: new Date().toISOString(),
    };
  }

  async exportUserData(companyId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            tradeName: true,
            document: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const consentHistory = await this.prisma.$queryRawUnsafe<ConsentLogItem[]>(
      `SELECT * FROM "LgpdConsentLog" WHERE "companyId" = $1 AND "userId" = $2 ORDER BY "createdAt" DESC`,
      companyId,
      userId,
    );

    const ordersCount = await this.prisma.customerOrder.count({ where: { companyId } });
    const customersCount = await this.prisma.customer.count({ where: { companyId } });
    const printersCount = await this.prisma.printer.count({ where: { companyId } });
    const filamentsCount = await this.prisma.filament.count({ where: { companyId } });

    return {
      exportMetadata: {
        legalFramework: "Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018)",
        article: "Art. 18, Inciso II e V (Acesso aos dados e portabilidade)",
        exportedAt: new Date().toISOString(),
      },
      titular: user,
      consentimento: consentHistory,
      estatisticasOperacionais: {
        totalPedidosCadastrados: ordersCount,
        totalClientesCadastrados: customersCount,
        totalImpressorasCadastradas: printersCount,
        totalBobinasFilamento: filamentsCount,
      },
    };
  }

  async requestAnonymization(companyId: string, userId: string, reason?: string) {
    // Registra revogação de consentimento e solicitação formal de exclusão
    const id = randomUUID();
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "LgpdConsentLog" ("id", "companyId", "userId", "userName", "userEmail", "termVersion", "accepted", "ipAddress", "userAgent", "createdAt")
       VALUES ($1, $2, $3, 'SOLICITAÇÃO DE ANONIMIZAÇÃO', $4, 'REVOGADO', false, NULL, $5, NOW())`,
      id,
      companyId,
      userId,
      reason || "Solicitação voluntária pelo titular dos dados",
      "LGPD Art. 18 - Direito à Eliminação/Anonimização",
    );

    return {
      success: true,
      message:
        "Sua solicitação de anonimização e exclusão de dados pessoais foi registrada com sucesso sob protocolo LGPD-" +
        id.slice(0, 8).toUpperCase() +
        ". Conforme o Art. 16 da Lei 13.709/2018, registros de auditoria e documentos fiscais serão mantidos exclusivamente pelo período legal obrigatório.",
    };
  }
}
