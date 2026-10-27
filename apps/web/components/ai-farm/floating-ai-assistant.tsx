"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { PublicUser } from "@/lib/auth-types";

type Action = {
  resource: string;
  operation: string;
  id?: string;
  data?: Record<string, unknown>;
  summary: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  pageContext?: string;
  action?: Action;
  actionState?: "pending" | "done" | "dismissed";
};

type ApiReply = { reply?: string; action?: Action | null };
type ApiPayload = {
  data?: ApiReply;
  message?: string | string[];
} & ApiReply;

// Mapeamento semântico de páginas e tarefas para o contexto da IA
const PAGE_CONTEXT_MAP: Record<
  string,
  {
    title: string;
    icon: string;
    bubbleHint: string;
    greeting: string;
    quickPrompts: { label: string; prompt: string }[];
  }
> = {
  "/": {
    title: "Dashboard Geral",
    icon: "⌂",
    bubbleHint: "Acompanhando o panorama geral da sua fazenda 3D.",
    greeting:
      "Olá! Estou monitorando sua Dashboard geral. Quer um resumo da produtividade, status das máquinas ou alertas de estoque?",
    quickPrompts: [
      { label: "Resumo da Farm", prompt: "Qual o resumo geral do status da fazenda 3D hoje?" },
      {
        label: "Alertas Urgentes",
        prompt: "Há algum alerta urgente de máquina parada ou filamento acabando?",
      },
      {
        label: "Dicas de Otimização",
        prompt: "O que você sugere para aumentar a eficiência de produção hoje?",
      },
    ],
  },
  "/printers": {
    title: "Impressoras 3D",
    icon: "🖨️",
    bubbleHint: "Posso ajudar a conectar telemetria, Klipper ou Bambu Lab.",
    greeting:
      "Vejo que você está na tela de Impressoras! Precisa de auxílio configurando telemetria (Bambu Lab, Klipper/Moonraker, OctoPrint) ou calibrando parâmetros térmicos?",
    quickPrompts: [
      {
        label: "Telemetria Bambu Lab",
        prompt: "Como funciona a sincronização e telemetria da Bambu Lab A1 no CTRL-Farm?",
      },
      {
        label: "Máquinas Disponíveis",
        prompt: "Quais impressoras estão cadastradas e prontas para receber trabalho?",
      },
      {
        label: "Fluxo & Nozzle",
        prompt: "Qual o fluxo recomendado para bico 0.4mm em impressões de alta velocidade?",
      },
    ],
  },
  "/filaments": {
    title: "Estoque de Filamentos",
    icon: "🧶",
    bubbleHint: "Controle de bobinas, pesagem e consumo por grama.",
    greeting:
      "Você está no gerenciador de Filamentos! Posso calcular consumo por peça, estimar sobras de carretel ou ajudar a cadastrar novas cores e materiais.",
    quickPrompts: [
      {
        label: "Bobinas Críticas",
        prompt: "Quais carretéis de filamento estão com estoque baixo (menos de 300g)?",
      },
      {
        label: "Custo por Grama",
        prompt: "Como calcular com precisão o custo por grama de uma bobina de PLA de R$ 95,00?",
      },
      {
        label: "PETG vs PLA",
        prompt: "Quais as principais diferenças de temperatura de bico e mesa entre PLA e PETG?",
      },
    ],
  },
  "/live": {
    title: "Monitoramento de Câmeras",
    icon: "📹",
    bubbleHint: "Streams ao vivo WebRTC e câmeras de inspeção.",
    greeting:
      "Estou monitorando as câmeras com você! Precisa de suporte configurando streams RTSP, WebRTC MediaMTX ou câmeras TP-Link TC60?",
    quickPrompts: [
      {
        label: "TP-Link TC60 RTSP",
        prompt: "Como configurar a câmera TP-Link TC60 para transmissão RTSP estável?",
      },
      {
        label: "Latência Baixa",
        prompt: "Como garantir latência ultra baixa (WebRTC) no monitoramento da impressora?",
      },
      {
        label: "Detecção de Falhas",
        prompt: "Como usar as câmeras para monitorar falhas (spaghetti/deslocamento de camada)?",
      },
    ],
  },
  "/pricing": {
    title: "Precificação & Custos",
    icon: "R$",
    bubbleHint: "Cálculos de orçamento, margem de lucro e energia elétrica.",
    greeting:
      "Na tela de Precificação! Quer que eu calcule o preço de venda de uma peça, considere depreciação de bico ou consumo de energia em kWh?",
    quickPrompts: [
      {
        label: "Cálculo de Peça 50g",
        prompt:
          "Calcule o preço de venda para uma peça de 50g em PLA com 3 horas de impressão e margem de 40%.",
      },
      {
        label: "Custo Elétrico (kWh)",
        prompt:
          "Como estimar o gasto elétrico de uma impressora de 150W rodando 24 horas a R$ 0,85/kWh?",
      },
      {
        label: "Margem Segura",
        prompt:
          "Qual margem de contribuição é recomendada para serviços de prototipagem 3D sob demanda?",
      },
    ],
  },
  "/orders": {
    title: "Orçamentos & Pedidos",
    icon: "📋",
    bubbleHint: "Gestão de orçamentos e propostas comerciais para clientes.",
    greeting:
      "Gerenciando Orçamentos! Posso ajudar a montar propostas comerciais, estimar prazos de entrega ou calcular descontos por lote.",
    quickPrompts: [
      {
        label: "Proposta Comercial",
        prompt: "Como estruturar uma proposta de impressão 3D profissional para envio ao cliente?",
      },
      {
        label: "Prazos de Lote",
        prompt: "Como estimar prazo de produção com segurança incluindo margem para falhas?",
      },
      {
        label: "Lotes com Desconto",
        prompt: "Qual percentual de desconto conceder para pedidos de mais de 20 peças?",
      },
    ],
  },
  "/production": {
    title: "Fila de Produção",
    icon: "▶",
    bubbleHint: "Escalonamento de ordens e distribuição nas impressoras.",
    greeting:
      "Você está no controle de Produção! Deseja planejar a fila de impressão, alocar máquinas livres ou calcular tempo estimado de conclusão?",
    quickPrompts: [
      {
        label: "Otimizar Fila",
        prompt: "Qual a melhor estratégia para ordenar a fila de impressão da farm hoje?",
      },
      {
        label: "Divisão de Lote",
        prompt:
          "Como dividir um lote de 10 peças entre 2 impressoras diferentes para terminar mais rápido?",
      },
      {
        label: "Prevenção de Paradas",
        prompt: "Quais cuidados tomar antes de iniciar impressões noturnas de mais de 8 horas?",
      },
    ],
  },
  "/materials": {
    title: "Insumos & Almoxarifado",
    icon: "▤",
    bubbleHint: "Bicos, parafusos, tubos PTFE e peças sobressalentes.",
    greeting:
      "Almoxarifado e Insumos! Precisa conferir estoque mínimo de bicos (nozzles), tubos PTFE, graxa térmica ou parafusos?",
    quickPrompts: [
      {
        label: "Peças Essenciais",
        prompt: "Quais peças de reposição são fundamentais manter no estoque de uma 3D Farm?",
      },
      {
        label: "Desgaste de Nozzle",
        prompt: "Quando devo substituir um bico de latão por um de aço temperado?",
      },
    ],
  },
  "/customers": {
    title: "Gestão de Clientes",
    icon: "♙",
    bubbleHint: "Base de contatos, histórico de projetos e CRM.",
    greeting:
      "Área de Clientes! Posso ajudar a organizar o histórico de pedidos, buscar dados cadastrais ou criar notas sobre preferências de impressão.",
    quickPrompts: [
      {
        label: "Fidelização 3D",
        prompt:
          "Quais estratégias funcionam bem para fidelizar clientes de serviços de impressão 3D?",
      },
      {
        label: "Briefing de Cliente",
        prompt: "Quais perguntas fazer ao cliente antes de aceitar um arquivo 3D para impressão?",
      },
    ],
  },
  "/suppliers": {
    title: "Fornecedores",
    icon: "♧",
    bubbleHint: "Parceiros de filamentos, hardware e frete.",
    greeting:
      "Gestão de Fornecedores! Posso ajudar a comparar marcas de filamento, avaliar fornecedores de componentes ou registrar novos contatos.",
    quickPrompts: [
      {
        label: "Melhores Marcas",
        prompt:
          "Quais marcas nacionais e importadas de filamento PLA e PETG têm melhor custo-benefício?",
      },
      {
        label: "Armazenamento",
        prompt: "Qual a forma ideal de estocar caixas de filamento para evitar umidade?",
      },
    ],
  },
  "/project-files": {
    title: "Arquivos de Projetos",
    icon: "▧",
    bubbleHint: "Arquivos 3D (STL, 3MF, STEP, G-Code).",
    greeting:
      "Biblioteca de Arquivos 3D! Precisa de orientações sobre orientação na mesa de impressão, suportes orgânicos ou conversão de arquivos?",
    quickPrompts: [
      {
        label: "STL vs 3MF",
        prompt: "Por que o formato 3MF é superior ao STL no fatiamento moderno?",
      },
      {
        label: "Suportes Árvore",
        prompt: "Quando usar suportes em árvore (tree supports) ao invés de suportes normais?",
      },
      {
        label: "Orientação na Mesa",
        prompt: "Como orientar uma peça mecânica para maximizar a resistência no eixo Z?",
      },
    ],
  },
  "/profile": {
    title: "Perfil & Segurança",
    icon: "👤",
    bubbleHint: "Configurações da sua conta, avatar e senhas.",
    greeting:
      "Você está no seu Perfil de Operador! Posso ajudar você a escolher um avatar bacana, criar uma senha forte ou explicar suas permissões de acesso.",
    quickPrompts: [
      {
        label: "Níveis de Acesso",
        prompt:
          "Quais as diferenças entre os 4 níveis de acesso: Padrão, Operação, Moderador e Administrador?",
      },
      {
        label: "Senha Segura",
        prompt: "Como criar uma senha robusta para proteger a fazenda de impressão 3D?",
      },
    ],
  },
  "/settings": {
    title: "Configurações & Acessos",
    icon: "⚙",
    bubbleHint: "Gestão de usuários, níveis de acesso e parâmetros da farm.",
    greeting:
      "Você está na Central de Configurações! Posso ajudar você a gerenciar os 4 níveis de acesso (Padrão, Operação, Moderador, Administrador) ou orientar sobre regras de governança.",
    quickPrompts: [
      {
        label: "4 Níveis de Acesso",
        prompt:
          "Explique detalhadamente as diferenças entre os 4 níveis: Padrão, Operação, Moderador e Administrador.",
      },
      {
        label: "Permissões de Operação",
        prompt: "O que um usuário no nível Operação pode executar no sistema?",
      },
      {
        label: "Segurança de Acesso",
        prompt: "Quais recomendações de segurança devo seguir ao cadastrar operadores na farm?",
      },
    ],
  },
};

export function FloatingAiAssistant({ user }: { user: PublicUser }) {
  const pathname = usePathname();

  // Se já estiver na página cheia da IA, não precisa exibir o avatar flutuante
  const isDedicatedAiPage = pathname === "/ai-farm";

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Identificação do contexto da página atual
  const activeContext =
    PAGE_CONTEXT_MAP[pathname] ??
    Object.entries(PAGE_CONTEXT_MAP).find(
      ([route]) => route !== "/" && pathname.startsWith(route),
    )?.[1] ??
    PAGE_CONTEXT_MAP["/"]!;

  const userName = user.name.split(" ")[0] || "Operador";

  // Inicializa mensagem de boas-vindas contextual se o chat estiver vazio
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "initial-context-welcome",
          role: "assistant",
          content: activeContext.greeting,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          pageContext: activeContext.title,
        },
      ]);
    }
  }, [activeContext, messages.length]);

  // Rola até o final das mensagens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setHasUnread(false);
    }
  }, [isOpen]);

  // Não renderiza na página dedicada de IA
  if (isDedicatedAiPage) return null;

  async function sendMessage(textToSend: string) {
    const prompt = textToSend.trim();
    if (!prompt || busy) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      pageContext: activeContext.title,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setBusy(true);

    try {
      // Anexa contexto da tela no prompt enviado para a API do Gemini
      const contextualMessages = nextMessages.slice(-12).map((m, idx, arr) => {
        if (idx === arr.length - 1 && m.role === "user") {
          return {
            role: m.role,
            content: `[Contexto da Aplicação: Usuário está na tela "${activeContext.title}" (${pathname}) | Empresa: ${user.companyName ?? "Farm 3D"}]\n${m.content}`,
          };
        }
        return { role: m.role, content: m.content };
      });

      const response = await fetch("/api/ai-farm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: contextualMessages }),
      });

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) {
        throw new Error(
          Array.isArray(payload.message)
            ? payload.message.join(" · ")
            : (payload.message ?? "Não foi possível obter resposta da IA."),
        );
      }

      const reply = payload.data ?? payload;

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: reply.reply ?? "Estou à disposição para ajudar com essa tarefa!",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        pageContext: activeContext.title,
        ...(reply.action ? { action: reply.action, actionState: "pending" as const } : {}),
      };

      setMessages((curr) => [...curr, botMessage]);
      if (!isOpen) setHasUnread(true);
    } catch (err) {
      setMessages((curr) => [
        ...curr,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Ops:** ${err instanceof Error ? err.message : "Falha ao processar solicitação."}`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      {/* Botão / Avatar Flutuante no Canto Inferior Direito */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5">
        {/* Balão de Dica Contextual Proativo (visível quando chat fechado) */}
        {!isOpen && !bubbleDismissed && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 relative max-w-xs rounded-2xl border border-emerald-500/30 bg-[#070c16]/95 p-3 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setBubbleDismissed(true)}
              className="absolute right-2 top-2 text-[10px] text-slate-400 hover:text-white"
              title="Dispensar aviso"
            >
              ✕
            </button>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <span>{activeContext.icon}</span>
              <span>CTRL Bot · {activeContext.title}</span>
            </div>
            <p className="mt-1 text-xs text-slate-300 pr-3">{activeContext.bubbleHint}</p>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="mt-2 text-[11px] font-bold text-emerald-400 hover:underline"
            >
              Conversar com CTRL Bot →
            </button>
          </div>
        )}

        {/* Botão do Avatar Flutuante */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setBubbleDismissed(true);
          }}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-emerald-400/60 bg-gradient-to-tr from-[#0b1220] via-[#0e1726] to-[#042f2e] text-2xl shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none"
          title={`CTRL Bot - Assistente Inteligente (${activeContext.title})`}
          aria-label="Abrir assistente virtual CTRL Bot"
        >
          {/* Anel Pulsante de Glow */}
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 opacity-40 blur-sm group-hover:opacity-75 animate-pulse" />

          {/* Ícone de Robô / Holograma */}
          <span className="relative select-none transition-transform group-hover:rotate-6">🤖</span>

          {/* Ponto de Status Online (Verde) */}
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0a0f1b] bg-emerald-400 shadow-sm" />

          {/* Notificação de Não Lido */}
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-black text-slate-950 animate-bounce">
              !
            </span>
          )}
        </button>
      </div>

      {/* Janela de Conversação Flutuante Humanizada */}
      {isOpen && (
        <aside
          role="complementary"
          aria-label="Chat com CTRL Bot"
          className="fixed bottom-22 right-5 z-50 flex h-[580px] max-h-[85vh] w-[380px] max-w-[92vw] flex-col overflow-hidden rounded-3xl border border-slate-700/80 bg-[#070c16]/95 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          {/* Cabeçalho da Janela de Chat */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-[#0b1220] p-3.5">
            <div className="flex items-center gap-2.5">
              <div className="relative grid h-9 w-9 place-items-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-lg shadow-sm">
                <span>🤖</span>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0b1220] bg-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-white">CTRL Bot</h3>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                    IA Ativa
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400 truncate max-w-[180px]">
                  <span>{activeContext.icon}</span>
                  <span className="truncate">{activeContext.title}</span>
                </div>
              </div>
            </div>

            {/* Ações do Topo: Tela cheia, Limpar, Fechar */}
            <div className="flex items-center gap-1">
              <Link
                href="/ai-farm"
                title="Expandir para tela cheia"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                ⤢
              </Link>
              <button
                type="button"
                onClick={() =>
                  setMessages([
                    {
                      id: `reset-${Date.now()}`,
                      role: "assistant",
                      content: `Conversa reiniciada. Estou com você em **${activeContext.title}**. O que podemos resolver?`,
                      timestamp: new Date().toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                    },
                  ])
                }
                title="Limpar mensagens"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                🗑
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Fechar assistente"
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Banner de Contexto da Página Atual */}
          <div className="flex items-center justify-between border-b border-slate-800/60 bg-emerald-950/20 px-3 py-1.5 text-[11px] text-emerald-300">
            <span className="flex items-center gap-1.5">
              <span>📍</span>
              <span>
                Identificado: <strong>{activeContext.title}</strong>
              </span>
            </span>
            <span className="text-[10px] text-slate-400">Contexto Sincronizado</span>
          </div>

          {/* Área de Mensagens com Rolagem */}
          <div className="flex-1 space-y-3 overflow-y-auto p-3.5 text-xs">
            {messages.map((msg) => {
              const isBot = msg.role === "assistant";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isBot ? "items-start" : "flex-row-reverse items-start"}`}
                >
                  {isBot ? (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-emerald-500/20 text-xs">
                      🤖
                    </span>
                  ) : (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-cyan-500/20 text-xs font-bold text-cyan-300">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                      isBot
                        ? "border border-slate-800 bg-[#0f172a] text-slate-200"
                        : "border border-emerald-500/30 bg-emerald-600/25 text-white"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-slate-500">
                      <span>{msg.pageContext ? `📍 ${msg.pageContext}` : ""}</span>
                      <span>{msg.timestamp}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {busy && (
              <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-emerald-500/20 text-xs">
                  🤖
                </span>
                <span>CTRL Bot pensando e analisando {activeContext.title}...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Atalhos Rápidos Contextuais da Página */}
          <div className="border-t border-slate-800/80 bg-[#090d16] p-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {activeContext.quickPrompts.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage(chip.prompt)}
                  className="shrink-0 rounded-lg border border-slate-800 bg-[#0f172a] px-2.5 py-1 text-[10px] font-medium text-slate-300 transition hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white"
                >
                  ⚡ {chip.label}
                </button>
              ))}
            </div>

            {/* Input de Envio de Mensagem */}
            <form onSubmit={handleSubmit} className="mt-1.5 flex items-center gap-1.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Pergunte ao CTRL Bot sobre ${activeContext.title}...`}
                disabled={busy}
                className="h-9 flex-1 rounded-xl border border-slate-700/80 bg-[#070c16] px-3 text-xs text-white outline-none transition focus:border-emerald-400 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-500 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
                title="Enviar mensagem"
              >
                ➤
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
}
