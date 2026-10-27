import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";

export interface SendActivationEmailOptions {
  to: string;
  clientName: string;
  companyName?: string;
  activationKey: string;
  planName: string;
  expiresAt: string | Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Serviço de e-mail SMTP configurado com host: ${host}:${port}`);
    } else {
      this.logger.log(
        "Serviço de e-mail iniciado em modo simulado/local (configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS no .env para envio real)."
      );
    }
  }

  async sendActivationKeyEmail(options: SendActivationEmailOptions): Promise<boolean> {
    const fromAddress = process.env.SMTP_FROM || '"CTRL-Farm Licensing" <licenciamento@ctrl-farm.local>';
    const expiryFormatted =
      options.expiresAt instanceof Date
        ? options.expiresAt.toLocaleDateString("pt-BR")
        : new Date(options.expiresAt).toLocaleDateString("pt-BR");

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Sua Chave de Ativação CTRL-Farm</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0a0f1b; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background-color: #101827; border: 1px solid #263246; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { border-bottom: 1px solid #263246; padding-bottom: 20px; margin-bottom: 24px; }
    .title { color: #20c997; font-size: 20px; font-weight: bold; margin: 0 0 6px 0; }
    .sub { color: #94a3b8; font-size: 13px; margin: 0; }
    .key-box { background-color: #0d1424; border: 2px dashed #20c997; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
    .key-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 8px; }
    .key-value { font-family: monospace; font-size: 24px; font-weight: bold; color: #20c997; letter-spacing: 2px; }
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .info-table td { padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 13px; }
    .info-table td.label { color: #94a3b8; width: 40%; }
    .info-table td.val { color: #f8fafc; font-weight: 600; text-align: right; }
    .steps { background-color: #151f30; border-radius: 10px; padding: 18px 20px; margin-top: 24px; }
    .steps h4 { margin: 0 0 10px 0; font-size: 14px; color: #38bdf8; }
    .steps ol { margin: 0; padding-left: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.6; }
    .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">CTRL-Farm Industrial Platform</h1>
      <p class="sub">Emissão Oficial de Licença & Ativação de Conta</p>
    </div>

    <p style="font-size: 15px; line-height: 1.5; color: #e2e8f0;">
      Olá, <strong>${options.clientName}</strong>${options.companyName ? ` (${options.companyName})` : ""}!
    </p>
    <p style="font-size: 14px; line-height: 1.5; color: #94a3b8;">
      Seu cadastro foi revisado e aprovado com sucesso pelo Administrador no Sistema ADM Gerente. Seu acesso à plataforma CTRL-Farm já está liberado.
    </p>

    <div class="key-box">
      <div class="key-label">Sua Chave de Ativação Oficial</div>
      <div class="key-value">${options.activationKey}</div>
    </div>

    <table class="info-table">
      <tr>
        <td class="label">Plano Liberado:</td>
        <td class="val">${options.planName}</td>
      </tr>
      <tr>
        <td class="label">Validade da Assinatura:</td>
        <td class="val">${expiryFormatted}</td>
      </tr>
      <tr>
        <td class="label">E-mail Cadastrado:</td>
        <td class="val">${options.to}</td>
      </tr>
    </table>

    <div class="steps">
      <h4>Como Ativar seu Sistema:</h4>
      <ol>
        <li>Abra o aplicativo <strong>CTRL-Farm.exe</strong> no seu computador ou acesse no navegador em <code>http://localhost:3000</code>.</li>
        <li>Faça login com seu e-mail e a senha cadastrados.</li>
        <li>Na tela de bloqueio <em>"Aguardando Registro da Chave de Ativação"</em>, insira a chave acima.</li>
        <li>Clique em <strong>Ativar Chave Agora</strong>. O acesso a todas as ferramentas será desbloqueado imediatamente!</li>
      </ol>
    </div>

    <div class="footer">
      <p>Este é um e-mail automático gerado pelo Sistema ADM Gerente do CTRL-Farm.</p>
    </div>
  </div>
</body>
</html>
    `;

    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: fromAddress,
          to: options.to,
          subject: `✔ Sua conta CTRL-Farm foi aprovada! Chave de Ativação: ${options.activationKey}`,
          text: `Olá ${options.clientName}!\n\nSeu cadastro no CTRL-Farm foi aprovado com sucesso.\nSua Chave de Ativação é: ${options.activationKey}\nPlano: ${options.planName}\nValidade: ${expiryFormatted}\n\nPara ativar, faça login no CTRL-Farm e insira sua chave.`,
          html: htmlContent,
        });
        this.logger.log(`E-mail com chave de ativação enviado com sucesso para ${options.to}`);
        return true;
      } else {
        this.logger.log(
          `[SIMULAÇÃO DE E-MAIL] Chave enviada para: ${options.to}\nDestinatário: ${options.clientName}\nChave: ${options.activationKey}\nPlano: ${options.planName}`
        );
        return true;
      }
    } catch (err: any) {
      this.logger.error(`Falha ao disparar e-mail para ${options.to}: ${err.message}`);
      return false;
    }
  }
}
