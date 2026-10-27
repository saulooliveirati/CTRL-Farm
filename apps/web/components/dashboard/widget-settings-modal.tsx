"use client";

import { useState } from "react";
import type {
  ChartMetric,
  ChartType,
  DashboardWidgetConfig,
  KpiMetric,
  TableEntity,
  TableFormat,
  ThemeTone,
} from "./dashboard-types";

interface WidgetSettingsModalProps {
  widget: DashboardWidgetConfig;
  onSave: (updated: DashboardWidgetConfig) => void;
  onClose: () => void;
  onRemove: (id: string) => void;
}

export function WidgetSettingsModal({
  widget,
  onSave,
  onClose,
  onRemove,
}: WidgetSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"content" | "style" | "layout">("content");
  const [draft, setDraft] = useState<DashboardWidgetConfig>({ ...widget });

  function update<K extends keyof DashboardWidgetConfig>(key: K, value: DashboardWidgetConfig[K]) {
    setDraft((curr) => ({ ...curr, [key]: value }));
  }

  const tones: { id: ThemeTone; label: string; color: string }[] = [
    { id: "emerald", label: "Esmeralda", color: "bg-[#20c997]" },
    { id: "cyan", label: "Ciano Tech", color: "bg-sky-400" },
    { id: "blue", label: "Azul Safira", color: "bg-blue-500" },
    { id: "amber", label: "Âmbar Alerta", color: "bg-[#f59e0b]" },
    { id: "violet", label: "Violeta", color: "bg-purple-500" },
    { id: "rose", label: "Rosa Falha", color: "bg-[#fb7185]" },
    { id: "slate", label: "Grafite Base", color: "bg-[#263246]" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="widget-editor-title"
        className="my-auto max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#263246] bg-[#101827] shadow-2xl flex flex-col"
      >
        {/* Header estilo Elementor / Divi */}
        <header className="flex items-center justify-between border-b border-[#263246] bg-[#0a0f1b] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#20c997]/15 text-[#20c997] font-bold text-sm border border-[#20c997]/30">
              ⚙
            </span>
            <div>
              <h2 id="widget-editor-title" className="text-sm font-bold text-slate-100 tracking-wide">
                Configurar Card: {draft.title}
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Tipo: <strong className="text-[#20c997] uppercase">{draft.type}</strong> · Construtor Modular
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onRemove(draft.id)}
              className="rounded-lg border border-rose-900/40 bg-rose-950/30 px-2.5 py-1 text-xs font-semibold text-[#fb7185] hover:bg-rose-900/60 transition"
              title="Excluir este card da dashboard"
            >
              🗑 Excluir
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-[#151f30] hover:text-white"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Abas do Construtor */}
        <div className="flex items-center border-b border-[#263246] bg-[#0d1422] px-5 text-xs font-semibold">
          {[
            { id: "content", label: "1. Conteúdo & Dados", icon: "📑" },
            { id: "style", label: "2. Gráfico & Estilo", icon: "🎨" },
            { id: "layout", label: "3. Dimensões & Grade", icon: "📐" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 transition ${
                activeTab === t.id
                  ? "border-[#20c997] text-[#20c997] font-bold bg-[#151f30]/60"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Conteúdo da Aba */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-200 bg-[#0a0f1b]/50">
          {/* ================= ABA 1: CONTEÚDO ================= */}
          {activeTab === "content" && (
            <div className="space-y-4">
              <label className="block space-y-1">
                <span className="font-semibold text-slate-300">Título do Card</span>
                <input
                  value={draft.title}
                  onChange={(e) => update("title", e.target.value)}
                  className="h-9 w-full rounded-xl border border-[#263246] bg-[#0a0f1b] px-3 text-xs text-white outline-none focus:border-[#20c997]"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-slate-300">Subtítulo / Descrição</span>
                <input
                  value={draft.subtitle ?? ""}
                  onChange={(e) => update("subtitle", e.target.value)}
                  placeholder="Ex.: Informações em tempo real..."
                  className="h-9 w-full rounded-xl border border-[#263246] bg-[#0a0f1b] px-3 text-xs text-white outline-none focus:border-[#20c997]"
                />
              </label>

              {/* Se for KPI Stat Card */}
              {draft.type === "kpi-stat" && (
                <div className="space-y-3 rounded-xl border border-[#263246] bg-[#101827] p-4">
                  <h4 className="font-bold text-[#20c997] uppercase tracking-wider text-[11px] font-mono">
                    Configuração da Métrica Numérica (KPI)
                  </h4>
                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-300">Dado a ser exibido:</span>
                    <select
                      value={draft.kpiMetric ?? "filaments_weight"}
                      onChange={(e) => update("kpiMetric", e.target.value as KpiMetric)}
                      className="h-9 w-full rounded-xl border border-[#263246] bg-[#0a0f1b] px-3 text-xs text-white outline-none focus:border-[#20c997]"
                    >
                      <option value="filaments_weight">Estoque Total de Filamento (kg)</option>
                      <option value="filaments_value">Valor Estimado em Filamento (R$)</option>
                      <option value="printers_total">Total de Impressoras da Farm</option>
                      <option value="printers_printing">Impressoras Imprimindo Agora</option>
                      <option value="printers_ready">Impressoras Livres / Disponíveis</option>
                      <option value="production_active">Ordens em Produção Ativas</option>
                      <option value="production_queued">Ordens Aguardando na Fila</option>
                      <option value="orders_total">Quantidade Total de Pedidos</option>
                      <option value="orders_revenue">Faturamento de Pedidos (R$)</option>
                      <option value="low_stock">Bobinas com Alerta de Estoque Baixo</option>
                    </select>
                  </label>

                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-300">Ícone personalizado</span>
                    <div className="flex gap-2">
                      {["◉", "▣", "▶", "⚠", "R$", "⚙️", "✓", "⏳", "📦", "🖨️"].map((ico) => (
                        <button
                          key={ico}
                          type="button"
                          onClick={() => update("customIcon", ico)}
                          className={`grid h-8 w-8 place-items-center rounded-xl border text-sm font-bold transition ${
                            draft.customIcon === ico
                              ? "border-[#20c997] bg-[#20c997]/20 text-[#20c997] ring-2 ring-[#20c997]/50"
                              : "border-[#263246] bg-[#0a0f1b] text-slate-300 hover:border-slate-500"
                          }`}
                        >
                          {ico}
                        </button>
                      ))}
                    </div>
                  </label>
                </div>
              )}

              {/* Se for Tabela / Lista de Dados */}
              {draft.type === "data-table" && (
                <div className="space-y-3 rounded-xl border border-[#263246] bg-[#101827] p-4">
                  <h4 className="font-bold text-[#20c997] uppercase tracking-wider text-[11px] font-mono">
                    Formato e Conteúdo da Tabela / Lista
                  </h4>

                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-300">Origem dos Dados:</span>
                    <select
                      value={draft.tableEntity ?? "production"}
                      onChange={(e) => update("tableEntity", e.target.value as TableEntity)}
                      className="h-9 w-full rounded-xl border border-[#263246] bg-[#0a0f1b] px-3 text-xs text-white outline-none focus:border-[#20c997]"
                    >
                      <option value="production">Ordens de Produção</option>
                      <option value="orders">Orçamentos e Pedidos</option>
                      <option value="printers">Impressoras & Telemetria</option>
                      <option value="filaments">Estoque de Filamentos</option>
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-300">Formato de Apresentação:</span>
                      <select
                        value={draft.tableFormat ?? "table"}
                        onChange={(e) => update("tableFormat", e.target.value as TableFormat)}
                        className="h-9 w-full rounded-xl border border-[#263246] bg-[#0a0f1b] px-3 text-xs text-white outline-none focus:border-[#20c997]"
                      >
                        <option value="table">Tabela Completa (Colunas)</option>
                        <option value="compact-list">Lista Compacta com Linhas</option>
                        <option value="cards-grid">Grid de Mini-Cards</option>
                      </select>
                    </label>

                    <label className="block space-y-1">
                      <span className="font-semibold text-slate-300">
                        Quantidade Máxima de Itens:
                      </span>
                      <select
                        value={draft.limit ?? 5}
                        onChange={(e) => update("limit", Number(e.target.value))}
                        className="h-9 w-full rounded-xl border border-[#263246] bg-[#0a0f1b] px-3 text-xs text-white outline-none focus:border-[#20c997]"
                      >
                        <option value={3}>3 itens</option>
                        <option value={5}>5 itens</option>
                        <option value={8}>8 itens</option>
                        <option value={12}>12 itens</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= ABA 2: GRÁFICO & ESTILO ================= */}
          {activeTab === "style" && (
            <div className="space-y-4">
              {/* Se for Card de Gráfico */}
              {draft.type === "chart-analytics" && (
                <div className="space-y-3 rounded-xl border border-[#263246] bg-[#101827] p-4">
                  <h4 className="font-bold text-[#20c997] uppercase tracking-wider text-[11px] font-mono">
                    Definição do Gráfico
                  </h4>

                  <label className="block space-y-1">
                    <span className="font-semibold text-slate-300">
                      Dado representado no gráfico:
                    </span>
                    <select
                      value={draft.chartMetric ?? "material_distribution"}
                      onChange={(e) => update("chartMetric", e.target.value as ChartMetric)}
                      className="h-9 w-full rounded-xl border border-[#263246] bg-[#0a0f1b] px-3 text-xs text-white outline-none focus:border-[#20c997]"
                    >
                      <option value="material_distribution">
                        Estoque por Tipo de Material (g)
                      </option>
                      <option value="printer_status">Distribuição da Frota por Status</option>
                      <option value="filament_brand">Consumo de Filamento por Fabricante</option>
                      <option value="orders_status">Pedidos por Situação</option>
                    </select>
                  </label>

                  <div className="space-y-1">
                    <span className="font-semibold text-slate-300">Tipo de Gráfico Visual:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {[
                        { id: "donut", label: "Rosca / Donut", icon: "◎" },
                        { id: "bar-horizontal", label: "Barras Horizontais", icon: "☷" },
                        { id: "bar-vertical", label: "Barras Verticais", icon: "📊" },
                        { id: "area-progress", label: "Progresso / Área", icon: "📈" },
                      ].map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => update("chartType", c.id as ChartType)}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${
                            draft.chartType === c.id
                              ? "border-[#20c997] bg-[#20c997]/15 text-[#20c997] ring-2 ring-[#20c997]/50"
                              : "border-[#263246] bg-[#0a0f1b] text-slate-400 hover:border-slate-600 hover:text-white"
                          }`}
                        >
                          <span className="text-xl mb-1">{c.icon}</span>
                          <span className="text-[10px] font-bold">{c.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Seletor de Paleta / Tema de Cor */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-300">Cor de Destaque do Card:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {tones.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => update("themeTone", t.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-left transition ${
                        draft.themeTone === t.id
                          ? "border-white bg-[#151f30] text-white ring-2 ring-[#20c997]"
                          : "border-[#263246] bg-[#0a0f1b] text-slate-400 hover:border-slate-700"
                      }`}
                    >
                      <span className={`h-3.5 w-3.5 rounded-full ${t.color}`} />
                      <span className="text-[11px] font-semibold">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Borda com Brilho Neon */}
              <label className="flex items-center gap-3 rounded-xl border border-[#263246] bg-[#101827] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(draft.showBorderGlow)}
                  onChange={(e) => update("showBorderGlow", e.target.checked)}
                  className="h-4 w-4 accent-[#20c997]"
                />
                <div>
                  <p className="font-semibold text-white">Borda com Efeito Glow (Neon Suave)</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Aplica iluminação sutil na borda para destacar métricas operacionais críticas.
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* ================= ABA 3: LAYOUT & DIMENSÕES ================= */}
          {activeTab === "layout" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="font-semibold text-slate-300">
                  Largura do Card no Grid (Colunas):
                </span>
                <p className="text-[10px] text-slate-400 font-mono">
                  Ajuste o espaço que este bloco ocupará na linha da grade responsiva de 12 colunas.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  {[
                    { cols: 1, label: "1 Coluna (25%)", desc: "Pequeno / KPI", icon: "▮▯▯▯" },
                    { cols: 2, label: "2 Colunas (50%)", desc: "Médio / Padrão", icon: "▮▮▯▯" },
                    { cols: 3, label: "3 Colunas (75%)", desc: "Grande / Destaque", icon: "▮▮▮▯" },
                    { cols: 4, label: "4 Colunas (100%)", desc: "Largura Total", icon: "▮▮▮▮" },
                  ].map((s) => (
                    <button
                      key={s.cols}
                      type="button"
                      onClick={() => update("colSpan", s.cols as any)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition ${
                        draft.colSpan === s.cols
                          ? "border-[#20c997] bg-[#20c997]/15 text-[#20c997] ring-2 ring-[#20c997]/50"
                          : "border-[#263246] bg-[#0a0f1b] text-slate-400 hover:border-slate-700 hover:text-white"
                      }`}
                    >
                      <span className="font-mono text-sm mb-1 tracking-wider">{s.icon}</span>
                      <strong className="text-xs text-white">{s.label}</strong>
                      <span className="text-[9px] text-slate-500 font-mono mt-0.5">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-[#263246] bg-[#101827] p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.visible}
                  onChange={(e) => update("visible", e.target.checked)}
                  className="h-4 w-4 accent-[#20c997]"
                />
                <div>
                  <p className="font-semibold text-white">Card Visível na Dashboard</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Desmarque para ocultar temporariamente sem perder as configurações.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <footer className="flex items-center justify-between border-t border-[#263246] bg-[#0a0f1b] px-5 py-3">
          <span className="text-[11px] text-slate-400 font-mono">
            Layout persistido no navegador.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#263246] px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#151f30] transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave(draft)}
              className="rounded-xl bg-[#20c997] px-4 py-1.5 text-xs font-bold text-[#06251e] hover:bg-[#1db889] transition shadow"
            >
              Aplicar Alterações
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
