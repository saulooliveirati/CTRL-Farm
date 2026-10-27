import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class CtrlFarmNotifierService {
  private readonly logger = new Logger(CtrlFarmNotifierService.name);

  private get ctrlFarmApiUrl(): string {
    const envUrl = process.env.CTRL_FARM_API_URL;
    if (envUrl) return envUrl.replace(/\/$/, "");

    const webUrl = process.env.CTRL_FARM_URL;
    if (webUrl) {
      // Se aponta para porta 3000 (Next.js), converte para a API na porta 3001
      return webUrl.replace(":3000", ":3001").replace(/\/$/, "");
    }

    return "http://localhost:3001";
  }

  /**
   * Envia notificação imediata de SUSPENSÃO para o CTRL-Farm
   * Ação mandatória: se a assinatura for suspensa por qualquer motivo no ADM Gerente,
   * suspende imediatamente a chave de ativação e envia esta chamada instantânea para travar o serviço no CTRL-Farm.
   */
  async notifyLicenseSuspension(activationKey: string, reason?: string): Promise<boolean> {
    const endpoint = `${this.ctrlFarmApiUrl}/licensing/notify-suspension`;
    this.logger.warn(
      `🚨 Disparando comando IMEDIATO de suspensão para CTRL-Farm em ${endpoint} (Chave: ${activationKey})`
    );

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activationKey,
          status: "SUSPENDED",
          action: "SUSPEND",
          reason: reason || "Assinatura suspensa por pagamento pendente no Sistema ADM Gerente.",
        }),
        signal: AbortSignal.timeout(5000), // Timeout de 5s para não prender o ADM Gerente
      });

      if (response.ok) {
        this.logger.log(
          `✅ Notificação de suspensão imediata confirmada com sucesso pelo CTRL-Farm para a chave ${activationKey}`
        );
        return true;
      } else {
        const errorText = await response.text().catch(() => "");
        this.logger.warn(
          `CTRL-Farm retornou status ${response.status} ao receber suspensão imediata: ${errorText}`
        );
        return false;
      }
    } catch (err: any) {
      this.logger.warn(
        `Falha ao contatar CTRL-Farm em ${endpoint} para suspensão imediata: ${err.message}. A suspensão ocorrerá na checagem programada.`
      );
      return false;
    }
  }

  /**
   * Envia notificação imediata de REATIVAÇÃO / RENOVAÇÃO para o CTRL-Farm
   */
  async notifyLicenseActivation(
    activationKey: string,
    expiresAt?: string,
    reason?: string
  ): Promise<boolean> {
    const endpoint = `${this.ctrlFarmApiUrl}/licensing/remote-sync`;
    this.logger.log(
      `Disparando comando de REATIVAÇÃO para CTRL-Farm em ${endpoint} (Chave: ${activationKey})`
    );

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activationKey,
          status: "ACTIVE",
          action: "ACTIVATE",
          expiresAt,
          reason: reason || "Assinatura ativada / pagamento aprovado no Sistema ADM Gerente.",
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        this.logger.log(
          `Reativação confirmada com sucesso pelo CTRL-Farm para a chave ${activationKey}`
        );
        return true;
      }
      return false;
    } catch (err: any) {
      this.logger.warn(
        `Falha ao contatar CTRL-Farm em ${endpoint} para reativação: ${err.message}`
      );
      return false;
    }
  }
}
