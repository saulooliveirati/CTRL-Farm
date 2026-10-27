"use client";

import { type FormEvent, useState, useRef, useEffect } from "react";
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
  action?: Action;
  actionState?: "pending" | "done" | "dismissed";
};

type ApiReply = { reply?: string; action?: Action | null };
type ApiPayload = {
  data?: ApiReply;
  message?: string | string[];
} & ApiReply;

type AssistantMode = "general" | "engineering" | "pricing" | "operations";

const assistantModes: Record<
  AssistantMode,
  { label: string; icon: string; description: string; hint: string }
> = {
  general: {
    label: "Geral",
    icon: "🤖",
    description: "Visão 360° da farm, dúvidas gerais e suporte operacional completo.",
    hint: "Consulte estoque, impressoras, telemetria e tire dúvidas gerais.",
  },
  engineering: {
    label: "Engenharia 3D",
    icon: "📐",
    description:
      "Parâmetros de fatiadores (Bambu Studio, Orca, Prusa), física de materiais e solução de defeitos.",
    hint: "Dúvidas sobre temperaturas, retração, velocidade, tolerâncias e warping.",
  },
  pricing: {
    label: "Cálculos & Custos",
    icon: "🧮",
    description:
      "Orçamentos, consumo de gramas, custo elétrico (kWh), depreciação e precificação de lotes.",
    hint: "Cálculo de preço sugerido, margem de contribuição e consumo elétrico.",
  },
  operations: {
    label: "Chão de Fábrica",
    icon: "🚀",
    description:
      "Escalonamento de máquinas, fila de produção, telemetria em tempo real e estoque crítico.",
    hint: "Planejamento de ordens, alocação de bicos e checagem de carretéis.",
  },
};

const categorizedPrompts = [
  {
    category: "Engenharia & Slicer 3D",
    icon: "📐",
    items: [
      {
        title: "PETG na Bambu Lab A1",
        prompt:
          "Qual temperatura de bico e mesa você recomenda para imprimir filamento PETG na Bambu Lab A1 e evitar fiapos?",
      },
      {
        title: "Solução para Warping em ABS",
        prompt:
          "Como evitar empenamento (warping) e delaminação ao imprimir peças em ABS e ASA em impressora fechada?",
      },
      {
        title: "Ajuste de Retração & Stringing",
        prompt:
          "Quais parâmetros de retração e temperatura devo ajustar para eliminar stringing (fiapos) em filamento PLA?",
      },
    ],
  },
  {
    category: "Cálculos & Orçamentos",
    icon: "🧮",
    items: [
      {
        title: "Custo de Lote (15 peças)",
        prompt:
          "Calcule o custo de matéria-prima e energia para produzir 15 peças de 40g em PLA com bico 0.4mm, considerando perda de 5%.",
      },
      {
        title: "Consumo Elétrico da Farm",
        prompt:
          "Como calculo o custo elétrico de 80 horas de impressão com potência média de 150W e tarifa de R$ 0,85/kWh?",
      },
      {
        title: "Markup & Preço de Venda",
        prompt:
          "Como calcular o preço sugerido de venda de uma peça impressa em 3D com margem de lucro líquida de 40%?",
      },
    ],
  },
  {
    category: "Telemetria & Produção",
    icon: "📊",
    items: [
      {
        title: "Status & Máquinas Ociosas",
        prompt:
          "Quais impressoras temos cadastradas na farm, qual o status de cada uma e quais estão ociosas prontas para rodar?",
      },
      {
        title: "Estoque Baixo (< 200g)",
        prompt:
          "Quais carretéis de filamento estão com estoque baixo (menos de 200g) ou insumos abaixo do estoque mínimo?",
      },
      {
        title: "Priorização da Fila",
        prompt:
          "Como está nossa fila de produção e quais pedidos têm prazo mais urgente para entrega?",
      },
    ],
  },
  {
    category: "Cadastros & Ações Rápidas",
    icon: "⚡",
    items: [
      {
        title: "Cadastrar Filamento",
        prompt:
          "Cadastre um novo filamento PLA Preto da marca eSun, peso 1000g, lote L103, preço R$ 119,90.",
      },
      {
        title: "Cadastrar Cliente",
        prompt:
          "Cadastre um novo cliente com nome 'Studio Arte 3D', email 'contato@studioarte3d.com' e telefone '(11) 98888-7777'.",
      },
      {
        title: "Cadastrar Insumo",
        prompt:
          "Cadastre um insumo de almoxarifado 'Bico Hardened Steel 0.4mm', categoria SPARE_PART, quantidade 5, mínimo 2, custo R$ 45,00.",
      },
    ],
  },
];

const quickChips = [
  {
    icon: "🌡️",
    label: "PETG na Bambu A1",
    prompt: "Qual temperatura ideal de bico e mesa para PETG na Bambu Lab A1?",
  },
  {
    icon: "🖨️",
    label: "Máquinas Ociosas",
    prompt: "Quais impressoras temos e quais estão livres agora?",
  },
  {
    icon: "🧮",
    label: "Cálculo de Peça",
    prompt: "Calcule o custo de matéria-prima para imprimir 10 peças de 50g em PLA por R$ 120/kg.",
  },
  {
    icon: "📦",
    label: "Estoque Crítico",
    prompt: "Quais filamentos ou insumos estão abaixo do estoque mínimo?",
  },
  {
    icon: "📋",
    label: "Fila de Produção",
    prompt: "Quais ordens de produção estão em andamento ou aguardando fila?",
  },
  {
    icon: "➕",
    label: "Novo Filamento",
    prompt:
      "Cadastre um carretel de filamento PLA Cinza da marca Creality, 1000g, preço R$ 105,00.",
  },
];

const resourceLabels: Record<string, string> = {
  printer: "Impressora",
  filament: "Filamento",
  customer: "Cliente",
  supplier: "Fornecedor",
  material: "Insumo de Almoxarifado",
  order: "Orçamento / Pedido",
  production: "Ordem de Produção",
  estimate: "Estimativa de Preço",
  projectFile: "Arquivo de Projeto",
  camera: "Câmera de Monitoramento",
};

const operationBadges: Record<string, { label: string; color: string }> = {
  create: { label: "CRIAR", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  update: { label: "EDITAR", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" },
  delete: { label: "EXCLUIR", color: "bg-rose-500/20 text-rose-300 border-rose-500/30" },
  cancel: { label: "CANCELAR", color: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};

function errorMessage(payload: ApiPayload) {
  return Array.isArray(payload.message)
    ? payload.message.join(" · ")
    : (payload.message ?? "Não foi possível concluir a solicitação.");
}

function replyFrom(payload: ApiPayload): ApiReply {
  return payload.data ?? payload;
}

/** Renderizador Markdown moderno, leve e sem bibliotecas externas pesadas */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const renderedBlocks: React.ReactNode[] = [];
  let currentList: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  const flushList = (key: string) => {
    if (currentList.length > 0) {
      renderedBlocks.push(
        <ul
          key={key}
          className="my-2.5 space-y-1.5 pl-5 list-disc text-slate-300 marker:text-cyan-400"
        >
          {currentList.map((item, i) => (
            <li key={`${key}-item-${i}`} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      currentList = [];
    }
  };

  const flushCode = (key: string) => {
    if (codeBlockLines.length > 0) {
      renderedBlocks.push(
        <div
          key={key}
          className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-[#070b13] shadow-md"
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 px-3 py-1.5 bg-[#0a0f1d] text-[10px] text-slate-400 font-mono">
            <span>código / configuração</span>
          </div>
          <pre className="overflow-x-auto p-3 text-xs font-mono text-cyan-300 leading-relaxed">
            <code>{codeBlockLines.join("\n")}</code>
          </pre>
        </div>,
      );
      codeBlockLines = [];
    }
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCode(`code-${idx}`);
        inCodeBlock = false;
      } else {
        flushList(`list-before-code-${idx}`);
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const listMatch = line.match(/^(\s*)[*-]\s+(.+)$/);
    if (listMatch) {
      currentList.push(listMatch[2]);
      continue;
    }

    flushList(`list-${idx}`);

    if (/^---+$|^===+$/.test(line.trim())) {
      renderedBlocks.push(<hr key={`hr-${idx}`} className="my-3.5 border-slate-800/90" />);
      continue;
    }

    if (line.startsWith("### ")) {
      renderedBlocks.push(
        <h4
          key={`h4-${idx}`}
          className="mt-3.5 mb-1.5 text-sm font-bold text-cyan-300 flex items-center gap-1.5"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          {renderInline(line.replace("### ", ""))}
        </h4>,
      );
      continue;
    }

    if (line.startsWith("## ")) {
      renderedBlocks.push(
        <h3
          key={`h3-${idx}`}
          className="mt-4 mb-2 text-base font-bold text-white border-b border-slate-800/60 pb-1"
        >
          {renderInline(line.replace("## ", ""))}
        </h3>,
      );
      continue;
    }

    if (line.startsWith("# ")) {
      renderedBlocks.push(
        <h2 key={`h2-${idx}`} className="mt-5 mb-2.5 text-lg font-extrabold text-white">
          {renderInline(line.replace("# ", ""))}
        </h2>,
      );
      continue;
    }

    if (!line.trim()) {
      renderedBlocks.push(<div key={`empty-${idx}`} className="h-1.5" />);
      continue;
    }

    renderedBlocks.push(
      <p key={`p-${idx}`} className="text-sm leading-relaxed text-slate-200">
        {renderInline(line)}
      </p>,
    );
  }

  flushList("list-final");
  flushCode("code-final");

  return <div className="space-y-1">{renderedBlocks}</div>;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="rounded bg-slate-800/90 px-1.5 py-0.5 font-mono text-xs text-cyan-300 border border-slate-700/60"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function AiFarmChat({ user, canManage }: { user: PublicUser | null; canManage: boolean }) {
  const userName = user?.name ? user.name.split(" ")[0] : "Comandante";
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : "U";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-welcome",
      role: "assistant",
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      content:
        `Olá, **${userName}**! Sou o **CTRL Bot**, seu copiloto de inteligência artificial da fazenda de impressão 3D.\n\n` +
        "Estou 100% sincronizado com seus equipamentos e dados da empresa. Posso ajudar você em:\n" +
        "- 🖨️ **Telemetria & Diagnóstico**: Status em tempo real das máquinas, temperaturas de bico/mesa e filas ativas.\n" +
        "- 🧮 **Cálculos & Orçamentos**: Custos precisos de filamento por grama, consumo elétrico (kWh) e sugestão de preço.\n" +
        "- 📐 **Engenharia & Fatiador 3D**: Resolução de defeitos (warping, stringing, entupimentos), parâmetros térmicos e materiais.\n" +
        "- ⚡ **Automação Cadastral**: Cadastro e edição de bobinas, impressoras, clientes e ordens com confirmação em 1 clique.\n\n" +
        "Escolha um atalho ao lado ou digite sua solicitação abaixo!",
    },
  ]);

  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<AssistantMode>("general");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 || busy) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, busy]);

  async function send(text: string) {
    const prompt = text.trim();
    if (!prompt || busy) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setNotice("");
    setBusy(true);

    try {
      const response = await fetch("/api/ai-farm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-16).map(({ role, content }) => ({ role, content })),
        }),
      });

      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(errorMessage(payload));

      const reply = replyFrom(payload);

      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: reply.reply ?? "Não recebi uma resposta do modelo.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        ...(reply.action ? { action: reply.action, actionState: "pending" as const } : {}),
      };

      setMessages((current) => [...current, botMessage]);
    } catch (error) {
      const errorMessageText =
        error instanceof Error ? error.message : "Falha ao se comunicar com o CTRL Bot.";

      setMessages((current) => [
        ...current,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Ops, algo deu errado:** ${errorMessageText}`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function execute(id: string, action: Action) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/ai-farm/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, confirmed: true }),
      });
      const payload = (await response.json()) as ApiPayload;
      if (!response.ok) throw new Error(errorMessage(payload));

      setMessages((current) =>
        current.map((message) =>
          message.id === id ? { ...message, actionState: "done" } : message,
        ),
      );
      setNotice("Ação aplicada com sucesso no sistema!");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível aplicar a alteração.");
    } finally {
      setBusy(false);
    }
  }

  function dismiss(id: string) {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, actionState: "dismissed" } : message,
      ),
    );
  }

  function copyText(id: string, text: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function exportChat() {
    const formatted = messages
      .map(
        (m) =>
          `### ${m.role === "user" ? user?.name || "Usuário" : "CTRL Bot"} (${m.timestamp})\n\n${m.content}\n`,
      )
      .join("\n---\n\n");

    const blob = new Blob([formatted], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ctrl-bot-conversa-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function clearChat() {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        content: `Nova conversa iniciada. Em que posso ajudar com a sua farm ou suas impressões hoje, **${userName}**?`,
      },
    ]);
    setNotice("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="mx-auto flex flex-col gap-4 max-w-7xl min-h-[calc(100vh-6.5rem)]">
      {/* Top Banner Elegante & Acolhedor */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-[#0d1527] via-[#0f1b33] to-[#0d1527] p-4 sm:p-5 shadow-xl">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-2xl shadow-lg shadow-cyan-500/20">
              <span>🤖</span>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#0d1527] bg-emerald-400" />
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
                  CTRL Bot
                  <span className="text-cyan-400 text-xs px-2 py-0.5 rounded-full bg-cyan-400/10 border border-cyan-400/20 font-mono font-medium">
                    v2.5
                  </span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  ⚡ Google Gemini 3.5 Flash
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-300">
                Olá, <strong className="text-white">{userName}</strong>! Seu assistente inteligente
                para engenharia 3D, telemetria da farm e orçamentos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition"
              title="Alternar atalhos laterais"
            >
              <span>{sidebarOpen ? "◀ Ocultar Painel" : "▶ Ver Atalhos"}</span>
            </button>

            <button
              type="button"
              onClick={exportChat}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-500 hover:text-white transition"
              title="Baixar transcrição do chat"
            >
              <span>📥 Exportar</span>
            </button>

            <button
              type="button"
              onClick={clearChat}
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-rose-500/50 hover:text-rose-300 transition"
              title="Reiniciar chat"
            >
              <span>🗑️ Limpar</span>
            </button>
          </div>
        </div>

        {/* Seletor de Modo Cognitivo */}
        <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
              Modo de Resposta:
            </span>
            {(Object.keys(assistantModes) as AssistantMode[]).map((key) => {
              const item = assistantModes[key];
              const active = mode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20"
                      : "border border-slate-800 bg-[#070b13] text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              {canManage ? "Permissão Total (Admin/Gestor)" : "Modo Consulta & Diagnóstico"}
            </span>
          </div>
        </div>
      </header>

      {/* Grid Principal: Painel Lateral de Ferramentas + Área de Chat */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1">
        {/* Painel Lateral de Ações & Hub (Colapsável) */}
        {sidebarOpen && (
          <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-3.5">
            {/* Card de Modo Ativo */}
            <div className="rounded-2xl border border-slate-800 bg-[#101827] p-4 shadow-md">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{assistantModes[mode].icon}</span>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                    Modo {assistantModes[mode].label}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {assistantModes[mode].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Central de Comandos Categorizados */}
            <div className="rounded-2xl border border-slate-800 bg-[#101827] p-4 shadow-md flex-1 overflow-y-auto max-h-[calc(100vh-21rem)] space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <span>⚡</span> Central de Consultas 3D
                </h3>
                <span className="text-[10px] text-slate-500">1 clique</span>
              </div>

              {categorizedPrompts.map((cat, i) => (
                <div key={i} className="space-y-1.5">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span>{cat.icon}</span>
                    <span>{cat.category}</span>
                  </h4>
                  <div className="space-y-1">
                    {cat.items.map((item, j) => (
                      <button
                        key={j}
                        type="button"
                        disabled={busy}
                        onClick={() => void send(item.prompt)}
                        className="w-full text-left rounded-xl border border-slate-800/80 bg-[#0b1220] p-2.5 hover:border-cyan-500/40 hover:bg-slate-800/60 transition group disabled:opacity-50"
                      >
                        <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 block truncate">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {item.prompt}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {/* Painel Central de Chat */}
        <main className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl min-h-[580px]">
          {/* Thread de Mensagens */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" aria-live="polite">
            {messages.map((message) => {
              const isUser = message.role === "user";
              return (
                <article
                  key={message.id}
                  className={`flex gap-3.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-xs font-bold shadow-md ${
                      isUser
                        ? "bg-gradient-to-tr from-slate-700 to-slate-600 text-white border border-slate-600"
                        : "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-cyan-500/20 border border-cyan-400/40"
                    }`}
                  >
                    {isUser ? userInitial : "🤖"}
                  </span>

                  {/* Conteúdo do Balão */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-4 transition-all shadow-md ${
                      isUser
                        ? "bg-gradient-to-r from-cyan-600/20 via-blue-600/20 to-indigo-600/20 border border-cyan-500/30 text-cyan-50 rounded-tr-sm"
                        : "border border-slate-800 bg-[#0b1220] text-slate-200 rounded-tl-sm"
                    }`}
                  >
                    {/* Header do Balão */}
                    <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-slate-800/60 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-200">
                          {isUser ? user?.name || "Você" : "CTRL Bot"}
                        </span>
                        {!isUser && (
                          <span className="rounded bg-cyan-500/10 px-1.5 py-0.2 text-[9px] font-mono text-cyan-300 border border-cyan-500/20">
                            Gemini
                          </span>
                        )}
                        <span>·</span>
                        <span>{message.timestamp}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyText(message.id, message.content)}
                        className="hover:text-cyan-300 transition text-[10px] flex items-center gap-1"
                        title="Copiar texto"
                      >
                        {copiedId === message.id ? "✓ Copiado" : "Copiar"}
                      </button>
                    </div>

                    {/* Corpo da Mensagem com Markdown */}
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </p>
                    ) : (
                      <MarkdownRenderer content={message.content} />
                    )}

                    {/* Card de Ação Proposta para Aprovação */}
                    {message.action && (
                      <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 shadow-inner">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                              Ação Proposta pelo CTRL Bot
                            </span>
                            {operationBadges[message.action.operation] && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                                  operationBadges[message.action.operation].color
                                }`}
                              >
                                {operationBadges[message.action.operation].label}
                              </span>
                            )}
                            <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300 font-mono">
                              {resourceLabels[message.action.resource] ?? message.action.resource}
                            </span>
                          </div>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-white">
                          {message.action.summary}
                        </p>

                        <details className="mt-2.5">
                          <summary className="cursor-pointer text-[11px] text-slate-400 hover:text-slate-200">
                            Ver dados técnicos enviados ao sistema
                          </summary>
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/50 p-2.5 text-[10px] text-cyan-300 font-mono border border-slate-800">
                            {JSON.stringify(
                              {
                                recurso: message.action.resource,
                                operacao: message.action.operation,
                                id: message.action.id,
                                dados: message.action.data,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </details>

                        {message.actionState === "pending" ? (
                          <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            {canManage ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void execute(message.id, message.action!)}
                                className="rounded-lg bg-emerald-400 hover:bg-emerald-300 px-3.5 py-2 text-xs font-bold text-slate-950 transition disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                              >
                                {busy ? (
                                  <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                                    Gravando no sistema...
                                  </>
                                ) : (
                                  <>✓ Confirmar e Gravar no Sistema</>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-amber-200/90 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
                                Alterações no banco de dados requerem perfil de Administrador ou
                                Gerente.
                              </span>
                            )}
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => dismiss(message.id)}
                              className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs text-slate-300 transition"
                            >
                              Descartar
                            </button>
                          </div>
                        ) : (
                          <p
                            className={`mt-2.5 text-xs font-semibold flex items-center gap-1.5 ${
                              message.actionState === "done" ? "text-emerald-300" : "text-slate-500"
                            }`}
                          >
                            {message.actionState === "done"
                              ? "✓ Ação aplicada com sucesso!"
                              : "✕ Ação descartada"}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}

            {busy && (
              <div className="flex items-center gap-3 text-xs text-cyan-300 bg-cyan-950/20 border border-cyan-800/30 rounded-xl px-4 py-3 w-fit shadow-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                </span>
                <span>
                  O <strong>CTRL Bot</strong> está analisando a telemetria e gerando a resposta...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Notificação Toast Inline */}
          {notice && (
            <div
              role="status"
              className="mx-4 mb-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs text-emerald-300 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <span>✓</span>
                <span>{notice}</span>
              </span>
              <button
                type="button"
                onClick={() => setNotice("")}
                className="text-emerald-400 hover:text-emerald-200 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* Barra de Pílulas de Ação Rápida */}
          <div className="border-t border-slate-800/80 bg-[#0d1424] px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
              Atalhos:
            </span>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                disabled={busy}
                onClick={() => void send(chip.prompt)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-300 hover:border-cyan-400/50 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>

          {/* Caixa de Entrada de Texto com Dock Elegante */}
          <form
            onSubmit={submit}
            className="flex flex-col gap-2 border-t border-slate-800 p-4 sm:p-5 bg-[#0d1424]"
          >
            <div className="relative flex items-end gap-2.5">
              <label className="sr-only" htmlFor="ctrl-bot-message">
                Mensagem para o CTRL Bot
              </label>
              <textarea
                id="ctrl-bot-message"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send(input);
                  }
                }}
                rows={2}
                maxLength={8000}
                placeholder="Pergunte ao CTRL Bot sobre fatiamento 3D, cálculos de peças, telemetria das máquinas ou peça para cadastrar algo..."
                className="min-h-[56px] flex-1 resize-y rounded-2xl border border-slate-700 bg-[#070b13] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 shadow-inner"
              />

              <button
                type="submit"
                disabled={!input.trim() || busy}
                className="h-[56px] px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 shrink-0"
              >
                <span>Enviar</span>
                <span>➤</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1">
              <span>
                Pressione <strong>Enter</strong> para enviar · <strong>Shift + Enter</strong> para
                quebra de linha
              </span>
              <span>
                Alimentado por <strong>Google Gemini 3.5 Flash</strong> · Seus dados operacionais
                protegidos
              </span>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
