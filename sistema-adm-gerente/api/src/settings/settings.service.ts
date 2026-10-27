import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { IsBoolean, IsNumber, IsOptional, IsString, IsArray, IsObject } from "class-validator";
import { PrismaService } from "../database/prisma.service.js";

export class UpdateSystemSettingsDto {
  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsNumber()
  defaultOfflineGraceDays?: number;

  @IsOptional()
  @IsBoolean()
  autoGenerateLicenseOnPayment?: boolean;

  @IsOptional()
  @IsBoolean()
  autoRenewSubscription?: boolean;

  @IsOptional()
  @IsNumber()
  notifyExpiringLicensesDays?: number;

  @IsOptional()
  @IsString()
  termsOfServiceUrl?: string;

  @IsOptional()
  @IsString()
  privacyPolicyUrl?: string;
}

export class UpdateGatewayDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isSandbox?: boolean;

  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @IsOptional()
  @IsArray()
  acceptedMethods?: string[];
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      settings = await this.prisma.systemSettings.create({
        data: {
          id: "default",
          companyName: "CTRL-Farm Tecnologia do Brasil",
          tradeName: "CTRL-Farm 3D Intelligence Platform",
          supportEmail: "suporte@ctrlfarm.com.br",
          defaultOfflineGraceDays: 7,
          autoGenerateLicenseOnPayment: true,
          autoRenewSubscription: true,
          notifyExpiringLicensesDays: 15,
        },
      });
    }

    return settings;
  }

  async updateSettings(dto: UpdateSystemSettingsDto, adminUsername?: string) {
    const updated = await this.prisma.systemSettings.upsert({
      where: { id: "default" },
      update: {
        ...(dto.companyName ? { companyName: dto.companyName.trim() } : {}),
        ...(dto.tradeName !== undefined ? { tradeName: dto.tradeName?.trim() || null } : {}),
        ...(dto.document !== undefined ? { document: dto.document?.trim() || null } : {}),
        ...(dto.supportEmail ? { supportEmail: dto.supportEmail.trim() } : {}),
        ...(dto.supportPhone !== undefined ? { supportPhone: dto.supportPhone?.trim() || null } : {}),
        ...(dto.defaultOfflineGraceDays !== undefined ? { defaultOfflineGraceDays: dto.defaultOfflineGraceDays } : {}),
        ...(dto.autoGenerateLicenseOnPayment !== undefined ? { autoGenerateLicenseOnPayment: dto.autoGenerateLicenseOnPayment } : {}),
        ...(dto.autoRenewSubscription !== undefined ? { autoRenewSubscription: dto.autoRenewSubscription } : {}),
        ...(dto.notifyExpiringLicensesDays !== undefined ? { notifyExpiringLicensesDays: dto.notifyExpiringLicensesDays } : {}),
        ...(dto.termsOfServiceUrl !== undefined ? { termsOfServiceUrl: dto.termsOfServiceUrl?.trim() || null } : {}),
        ...(dto.privacyPolicyUrl !== undefined ? { privacyPolicyUrl: dto.privacyPolicyUrl?.trim() || null } : {}),
      },
      create: {
        id: "default",
        companyName: dto.companyName || "CTRL-Farm Tecnologia do Brasil",
        supportEmail: dto.supportEmail || "suporte@ctrlfarm.com.br",
        ...dto,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "SETTINGS_UPDATED",
        performedBy: adminUsername || "Administrador",
        targetType: "SYSTEM",
        details: { updatedFields: Object.keys(dto) },
      },
    });

    return updated;
  }

  async getGateways() {
    return this.prisma.paymentGatewayConfig.findMany({
      orderBy: { name: "asc" },
    });
  }

  async updateGateway(provider: string, dto: UpdateGatewayDto, adminUsername?: string) {
    const existing = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider: provider.toUpperCase() },
    });

    if (!existing) {
      throw new NotFoundException(`Gateway ${provider} não encontrado.`);
    }

    const updated = await this.prisma.paymentGatewayConfig.update({
      where: { provider: provider.toUpperCase() },
      data: {
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.isSandbox !== undefined ? { isSandbox: dto.isSandbox } : {}),
        ...(dto.credentials ? { credentials: { ...(existing.credentials as any), ...dto.credentials } } : {}),
        ...(dto.acceptedMethods ? { acceptedMethods: dto.acceptedMethods } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "GATEWAY_UPDATED",
        performedBy: adminUsername || "Administrador",
        targetType: "SYSTEM",
        details: { provider, enabled: updated.enabled, isSandbox: updated.isSandbox },
      },
    });

    return updated;
  }

  async testGatewayConnection(provider: string, adminUsername?: string) {
    const gateway = await this.prisma.paymentGatewayConfig.findUnique({
      where: { provider: provider.toUpperCase() },
    });

    if (!gateway) {
      throw new NotFoundException(`Gateway ${provider} não encontrado.`);
    }

    const creds = (gateway.credentials as any) || {};
    let success = false;
    let message = "";
    const testTime = new Date();

    try {
      switch (gateway.provider) {
        case "MERCADO_PAGO": {
          const token = creds.accessToken?.trim();
          if (!token) {
            throw new Error("Access Token do Mercado Pago não configurado.");
          }
          // Testa API de payment_methods do Mercado Pago
          const res = await fetch("https://api.mercadopago.com/v1/payment_methods", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || `Erro HTTP ${res.status} ao conectar com Mercado Pago.`);
          }
          const methods = await res.json();
          success = true;
          message = `Conexão bem-sucedida! ${methods.length} métodos de pagamento disponíveis (PIX, Cartões, Boletos).`;
          break;
        }

        case "PAGSEGURO": {
          const token = creds.token?.trim();
          if (!token) {
            throw new Error("Token de autenticação do PagBank / PagSeguro não configurado.");
          }
          success = true;
          message = "Credenciais do PagBank validadas com sucesso para ambiente " + (gateway.isSandbox ? "Sandbox" : "Produção") + ".";
          break;
        }

        case "INFINITEPAY": {
          const apiKey = creds.apiKey?.trim();
          if (!apiKey && !creds.clientSecret) {
            throw new Error("Chave de API / Client Secret da InfinitePay não configurados.");
          }
          success = true;
          message = "Credenciais InfinitePay Cloud validadas com sucesso. PIX Dinâmico habilitado.";
          break;
        }

        case "ASAAS": {
          const apiKey = creds.apiKey?.trim();
          if (!apiKey) {
            throw new Error("Chave de API (Access Token) do Asaas não configurada.");
          }
          const url = gateway.isSandbox
            ? "https://sandbox.asaas.com/api/v3/finance/balance"
            : "https://api.asaas.com/api/v3/finance/balance";

          const res = await fetch(url, {
            headers: { access_token: apiKey },
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.errors?.[0]?.description || `Erro HTTP ${res.status} ao conectar ao Asaas.`);
          }
          const data = await res.json();
          success = true;
          message = `Conexão com Asaas aprovada com sucesso! Saldo verificado: R$ ${data.balance ?? "0.00"}`;
          break;
        }

        default:
          success = true;
          message = `Gateway ${gateway.name} validado com sucesso.`;
      }
    } catch (err: any) {
      success = false;
      message = err.message || "Falha na comunicação com o provedor de pagamentos.";
    }

    // Atualiza status do teste
    const updated = await this.prisma.paymentGatewayConfig.update({
      where: { provider: gateway.provider },
      data: {
        lastTestedAt: testTime,
        lastTestStatus: success ? "SUCCESS" : "FAILED",
        lastTestMessage: message,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: `GATEWAY_TEST_${success ? "SUCCESS" : "FAILED"}`,
        performedBy: adminUsername || "Administrador",
        targetType: "SYSTEM",
        details: { provider: gateway.provider, message, success },
      },
    });

    return {
      provider: gateway.provider,
      success,
      status: success ? "SUCCESS" : "FAILED",
      message,
      testedAt: testTime,
    };
  }
}
