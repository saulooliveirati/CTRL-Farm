import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface AiSupportResponse {
  reply: string;
  shouldEscalate: boolean;
  aiSummary?: string;
}

@Injectable()
export class SupportAiService {
  private readonly logger = new Logger(SupportAiService.name);
  private readonly geminiApiKey: string;
  private readonly models = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ];

  constructor(private readonly config: ConfigService) {
    this.geminiApiKey =
      this.config.get<string>("GEMINI_API_KEY") ||
      "AQ.Ab8RN6IdoHez-Jzwcj2ZqWA6nFpNkjrh4kDxsQ7Zz41pOFrl_g";
  }

  /**
   * Avalia a mensagem do usuário, detecta necessidade de transbordo humano
   * e gera a resposta técnica de Nível 1.
   */
  async processUserMessage(params: {
    ticketSubject: string;
    userMessage: string;
    conversationHistory: Array<{ senderType: string; content: string }>;
  }): Promise<AiSupportResponse> {
    const { ticketSubject, userMessage, conversationHistory } = params;
    const lowerMsg = userMessage.toLowerCase();

    // 1. Verificação de intenção explícita de falar com suporte humano
    const humanKeywords = [
      "humano",
      "atendente",
      "pessoa",
      "especialista",
      "gerente",
      "falar com alguém",
      "falar com alguem",
      "transbordo",
      "alguem real",
      "alguém real",
      "suporte humano",
      "atendimento humano",
    ];

    const wantsHuman = humanKeywords.some((kw) => lowerMsg.includes(kw));

    if (wantsHuman) {
      const summary = this.generateSummary(ticketSubject, userMessage, conversationHistory);
      return {
        shouldEscalate: true,
        reply:
          "Com certeza! Estou transferindo o seu chamado agora mesmo para a nossa equipe técnica especializada no Sistema ADM. Um de nossos atendentes humanos já foi notificado e assumirá esta conversa em instantes para lhe ajudar com todo o suporte necessário.",
        aiSummary: summary,
      };
    }

    // 2. Tenta resposta avançada via Google Gemini
    try {
      const geminiReply = await this.queryGemini({
        ticketSubject,
        userMessage,
        conversationHistory,
      });

      if (geminiReply) {
        const summary = this.generateSummary(ticketSubject, userMessage, conversationHistory);
        return {
          shouldEscalate: false,
          reply: geminiReply,
          aiSummary: summary,
        };
      }
    } catch (err: any) {
      this.logger.warn(`Gemini API indisponível no suporte (${err.message}). Utilizando base de conhecimento local.`);
    }

    // 3. Fallback inteligente baseado nas regras técnicas do CTRL-Farm e Impressão 3D
    const localReply = this.generateLocalKnowledgeReply(userMessage, ticketSubject);
    const summary = this.generateSummary(ticketSubject, userMessage, conversationHistory);

    return {
      shouldEscalate: false,
      reply: localReply,
      aiSummary: summary,
    };
  }

  /**
   * Gera um resumo conciso da dúvida do usuário para contextualizar o atendente humano no Sistema ADM
   */
  generateSummary(
    subject: string,
    latestMessage: string,
    history: Array<{ senderType: string; content: string }>
  ): string {
    const userMessages = history
      .filter((h) => h.senderType === "USER")
      .map((h) => h.content);
    userMessages.push(latestMessage);

    const contextSample = userMessages.slice(-3).join(" | ");
    return `Assunto: ${subject}. Dúvida relatada: ${contextSample.substring(0, 300)}`;
  }

  private async queryGemini(params: {
    ticketSubject: string;
    userMessage: string;
    conversationHistory: Array<{ senderType: string; content: string }>;
  }): Promise<string | null> {
    const systemPrompt = `
Você é o Assistente Virtual de Suporte Técnico Nível 1 do CTRL-Farm Industrial Platform.
Sua missão é fornecer respostas ágeis, empáticas, altamente profissionais e tecnicamente precisas sobre a plataforma CTRL-Farm e impressão 3D (FDM/SLA).

DIRETRIZES TÉCNICAS:
1. Impressoras & Conectividade: O CTRL-Farm gerencia impressoras via Klipper Moonraker, OctoPrint e Bambu Lab (MQTT local).
2. Filamentos & Temperaturas:
   - PLA: Nozzle 190-215°C, Mesa 50-60°C.
   - PETG: Nozzle 230-250°C, Mesa 70-85°C (cuidado com primeira camada não colar demais em PEI liso).
   - ABS: Nozzle 235-255°C, Mesa 90-110°C (requer gabinete fechado para evitar empenamento/warping).
   - TPU: Nozzle 210-230°C, Mesa 30-50°C (baixa velocidade, 20-30mm/s, retração reduzida).
3. Produção & Fatiamento: Fila de produção com ordens de serviço, status dinâmicos (QUEUED, PRINTING, FINISHED, FAILED).
4. Licenciamento: Chaves RSA assinadas digitalmente pelo Sistema ADM Gerente. Planos Starter, Professional, Business e Enterprise.
5. Se não souber responder com certeza ou se o problema exigir acesso remoto ao computador do cliente, oriente o usuário que ele pode clicar em "Solicitar Atendente Humano" a qualquer momento.
6. Responda em português brasileiro de maneira clara, formatando passos em bullet points quando aplicável.
`;

    const contents = [
      ...params.conversationHistory.slice(-6).map((m) => ({
        role: m.senderType === "AI_BOT" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      {
        role: "user",
        parts: [
          {
            text: `[Assunto do Chamado: ${params.ticketSubject}]\nMensagem do Cliente: ${params.userMessage}`,
          },
        ],
      },
    ];

    for (const model of this.models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.geminiApiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 1024,
            },
          }),
          signal: AbortSignal.timeout(3500),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) return text.trim();
        }
      } catch (e) {
        // tenta próximo modelo
      }
    }

    return null;
  }

  /**
   * Base de conhecimento técnica local offline para garantir que o suporte nunca falhe
   */
  private generateLocalKnowledgeReply(message: string, subject: string): string {
    const text = (message + " " + subject).toLowerCase();

    if (text.includes("descolando") || text.includes("mesa") || text.includes("warping") || text.includes("adesao") || text.includes("adesão")) {
      return (
        "Problemas de adesão na primeira camada geralmente ocorrem devido a nivelamento ou temperatura inadequada:\n\n" +
        "1. **Limpeza do Bed:** Limpe a chapa PEI com água morna e detergente neutro, ou álcool isopropílico 99%.\n" +
        "2. **Z-Offset:** Ajuste o Z-Offset para garantir que o bico amasse levemente a primeira camada (squish) sem raspar a mesa.\n" +
        "3. **Temperaturas Recomendadas:**\n" +
        "   - **PLA:** Bico 205°C | Mesa 60°C\n" +
        "   - **PETG:** Bico 240°C | Mesa 75°C\n" +
        "   - **ABS:** Bico 245°C | Mesa 100°C (com gabinete fechado)\n" +
        "4. **Adesivos:** Se necessário, utilize spray adesivo para impressão 3D ou cola bastão PVP.\n\n" +
        "Caso o problema persista, você pode clicar em **'Solicitar Atendente Humano'** para abrirmos uma sessão de diagnóstico assistido!"
      );
    }

    if (text.includes("entupimento") || text.includes("clog") || text.includes("bico") || text.includes("nozzle") || text.includes("extrusao") || text.includes("extrusão")) {
      return (
        "Para diagnosticar e solucionar entupimento no bico extrusor:\n\n" +
        "1. **Cold Pull (Puxada a frio):** Aqueça o bico até a temperatura de transição vítrea do filamento (~140°C para PLA) e puxe o filamento firmemente para cima.\n" +
        "2. **Agulha de Acupuntura:** Aqueça o bico a 230°C e insira a agulha de baixo para cima para desobstruir o orifício.\n" +
        "3. **Verificação da Engrenagem:** Confira se a engrenagem do extrusor não está mastigando o filamento ou com pressão frouxa.\n" +
        "4. **Ventoinha do Hotend:** Garanta que a ventoinha do dissipador de calor esteja girando em 100% para evitar 'heat creep' (amolecimento prematuro do filamento antes da zona de fusão).\n\n" +
        "Precisa de mais ajuda? É só clicar em **'Solicitar Atendente Humano'**!"
      );
    }

    if (text.includes("klipper") || text.includes("moonraker") || text.includes("octoprint") || text.includes("conectar") || text.includes("impressora")) {
      return (
        "Para integrar sua impressora no CTRL-Farm:\n\n" +
        "1. Acesse o menu **Impressoras > Nova Impressora**.\n" +
        "2. Selecione o tipo de firmware: **Klipper (Moonraker)** ou **OctoPrint**.\n" +
        "3. Insira o endereço IP local da sua impressora (ex: `192.168.1.150`) e a porta (padrão 7125 para Moonraker e 5000 para OctoPrint).\n" +
        "4. Se estiver usando chave de API no OctoPrint, cole-a no campo correspondente.\n" +
        "5. Clique em **Testar Conexão** para validar a telemetria em tempo real.\n\n" +
        "Se o sistema não conseguir comunicar, confirme se o firewall da sua rede local permite a porta correspondente."
      );
    }

    if (text.includes("licenca") || text.includes("licença") || text.includes("ativacao") || text.includes("ativação") || text.includes("chave") || text.includes("plano")) {
      return (
        "Informações sobre a Chave de Ativação e Licença:\n\n" +
        "1. A sua chave é fornecida no e-mail de boas-vindas após a aprovação pelo Sistema ADM Gerente.\n" +
        "2. Para inseri-la ou renová-la, acesse **Configurações > Licenciamento** e clique em **Inserir Chave de Ativação**.\n" +
        "3. O formato oficial é: `CTRL-FARM-XXXX-XXXX-XXXX`.\n" +
        "4. O CTRL-Farm possui tolerância offline de até 15 dias, permitindo operar sua fazenda de impressão mesmo sem internet."
      );
    }

    return (
      `Olá! Analisei sua solicitação sobre "${subject}":\n\n` +
      "Entendi o seu ponto. No CTRL-Farm, os módulos de produção, controle de estoque de bobinas e telemetria de impressoras trabalham integrados para manter sua fazenda operando em alta eficiência.\n\n" +
      "Você pode me enviar mais detalhes, fotos da peça ou áudio da impressora aqui pelo chat para eu investigar a fundo, ou se preferir um atendimento especializado com nosso time técnico, basta clicar no botão **'Solicitar Atendente Humano'** no topo da tela!"
    );
  }
}
