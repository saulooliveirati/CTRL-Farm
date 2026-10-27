"use client";

import { useState } from "react";
import type { DashboardWidgetConfig } from "./dashboard-types";

interface WidgetCatalogModalProps {
  onAdd: (widget: DashboardWidgetConfig) => void;
  onClose: () => void;
}

interface CatalogItem {
  id: string;
  category: "industrial" | "metrics" | "charts" | "tables" | "operational";
  title: string;
  description: string;
  icon: string;
  defaultColSpan: 1 | 2 | 3 | 4;
  previewType: string;
  createWidget: () => DashboardWidgetConfig;
}

export function WidgetCatalogModal({ onAdd, onClose }: WidgetCatalogModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const catalogItems: CatalogItem[] = [
    // Telemetria Industrial Moderna
    {
      id: "cat-kpi-active-printers",
      category: "industrial",
      title: "Parque de Impressoras (KPI)",
      description: "Métrica em tempo real: ocupação da frota (ex: 18/24, 75%) e barra de capacidade.",
      icon: "🖨️",
      defaultColSpan: 1,
      previewType: "Industrial Dark Mode",
      createWidget: () => ({
        id: `kpi-printers-${Date.now()}`,
        type: "kpi-active-printers",
        title: "Parque de Impressoras",
        colSpan: 1,
        visible: true,
        themeTone: "emerald",
      }),
    },
    {
      id: "cat-kpi-production-queue",
      category: "industrial",
      title: "Fila de Produção (KPI)",
      description: "Total de ordens na fila, trabalhos adicionados hoje e estimativa de horas.",
      icon: "⏳",
      defaultColSpan: 1,
      previewType: "Industrial Dark Mode",
      createWidget: () => ({
        id: `kpi-queue-${Date.now()}`,
        type: "kpi-production-queue",
        title: "Fila de Produção",
        colSpan: 1,
        visible: true,
        themeTone: "blue",
      }),
    },
    {
      id: "cat-kpi-filament-stock",
      category: "industrial",
      title: "Estoque de Insumos (KPI)",
      description: "Saldo total disponível em kg e badge inteligente de alerta para bobinas baixas.",
      icon: "◉",
      defaultColSpan: 1,
      previewType: "Industrial Dark Mode",
      createWidget: () => ({
        id: `kpi-filament-${Date.now()}`,
        type: "kpi-filament-stock",
        title: "Estoque de Insumos",
        colSpan: 1,
        visible: true,
        themeTone: "amber",
      }),
    },
    {
      id: "cat-kpi-efficiency",
      category: "industrial",
      title: "Eficiência da Farm (KPI)",
      description: "Eficiência operacional calculada com mini sparkline SVG verde neon.",
      icon: "📈",
      defaultColSpan: 1,
      previewType: "Industrial Dark Mode",
      createWidget: () => ({
        id: `kpi-eff-${Date.now()}`,
        type: "kpi-efficiency",
        title: "Eficiência da Farm",
        colSpan: 1,
        visible: true,
        themeTone: "emerald",
      }),
    },
    {
      id: "cat-printer-fleet-grid",
      category: "industrial",
      title: "Grid de Frota com Câmeras & Telemetria",
      description: "Cards individuais com anel de progresso neon, temperaturas de bico/mesa e feed de câmera.",
      icon: "📹",
      defaultColSpan: 4,
      previewType: "Alta Densidade",
      createWidget: () => ({
        id: `printer-fleet-${Date.now()}`,
        type: "printer-fleet-grid",
        title: "Parque de Impressoras 3D",
        subtitle: "Telemetria em tempo real, temperaturas e feeds de câmera",
        colSpan: 4,
        visible: true,
        themeTone: "emerald",
      }),
    },
    {
      id: "cat-production-queue-list",
      category: "industrial",
      title: "Fila de Impressão Prioritária",
      description: "Lista com badges coloridos por polímero (PLA, PETG, ABS, Resina) e estimativas.",
      icon: "📑",
      defaultColSpan: 2,
      previewType: "Lista Compacta",
      createWidget: () => ({
        id: `queue-list-${Date.now()}`,
        type: "production-queue-list",
        title: "Fila de Impressão Prioritária",
        subtitle: "Ordens aguardando processamento e materiais",
        colSpan: 2,
        visible: true,
        themeTone: "blue",
      }),
    },
    {
      id: "cat-filament-telemetry-chart",
      category: "industrial",
      title: "Consumo Semanal de Filamento",
      description: "Gráfico de área e linha suave Bézier em verde neon com métricas diárias.",
      icon: "📊",
      defaultColSpan: 2,
      previewType: "Gráfico SVG Suave",
      createWidget: () => ({
        id: `filament-chart-${Date.now()}`,
        type: "filament-telemetry-chart",
        title: "Consumo Semanal de Filamento",
        subtitle: "Telemetria de insumo consumido por dia",
        colSpan: 2,
        visible: true,
        themeTone: "emerald",
      }),
    },

    // Métricas Básicas (KPIs)
    {
      id: "cat-kpi-filaments-kg",
      category: "metrics",
      title: "Filamento em Estoque (kg)",
      description: "Peso total disponível em bobinas cadastradas no galpão.",
      icon: "◉",
      defaultColSpan: 1,
      previewType: "Métrica Numérica",
      createWidget: () => ({
        id: `kpi-filaments-${Date.now()}`,
        type: "kpi-stat",
        title: "Filamento em Estoque",
        colSpan: 1,
        visible: true,
        kpiMetric: "filaments_weight",
        customIcon: "◉",
        themeTone: "amber",
      }),
    },
    {
      id: "cat-kpi-filaments-val",
      category: "metrics",
      title: "Patrimônio em Filamentos (R$)",
      description: "Custo total monetário armazenado em bobinas de insumo.",
      icon: "R$",
      defaultColSpan: 1,
      previewType: "Métrica Financeira",
      createWidget: () => ({
        id: `kpi-fil-val-${Date.now()}`,
        type: "kpi-stat",
        title: "Patrimônio em Filamentos",
        colSpan: 1,
        visible: true,
        kpiMetric: "filaments_value",
        customIcon: "R$",
        themeTone: "cyan",
      }),
    },
    {
      id: "cat-kpi-printers-printing",
      category: "metrics",
      title: "Impressoras Imprimindo",
      description: "Contador ao vivo de máquinas operando ativamente na farm.",
      icon: "⚙️",
      defaultColSpan: 1,
      previewType: "Métrica Operacional",
      createWidget: () => ({
        id: `kpi-printers-print-${Date.now()}`,
        type: "kpi-stat",
        title: "Imprimindo Agora",
        colSpan: 1,
        visible: true,
        kpiMetric: "printers_printing",
        customIcon: "⚙️",
        themeTone: "blue",
      }),
    },
    {
      id: "cat-kpi-revenue",
      category: "metrics",
      title: "Faturamento em Pedidos (R$)",
      description: "Valor total negociado em orçamentos e pedidos de clientes.",
      icon: "💵",
      defaultColSpan: 1,
      previewType: "Métrica Financeira",
      createWidget: () => ({
        id: `kpi-revenue-${Date.now()}`,
        type: "kpi-stat",
        title: "Faturamento de Pedidos",
        colSpan: 1,
        visible: true,
        kpiMetric: "orders_revenue",
        customIcon: "R$",
        themeTone: "emerald",
      }),
    },
    {
      id: "cat-kpi-low-stock",
      category: "metrics",
      title: "Alerta de Estoque Baixo",
      description: "Contador de carretéis com menos de 300g precisando de reposição.",
      icon: "⚠",
      defaultColSpan: 1,
      previewType: "Alerta Crítico",
      createWidget: () => ({
        id: `kpi-low-stock-${Date.now()}`,
        type: "kpi-stat",
        title: "Estoque Baixo",
        colSpan: 1,
        visible: true,
        kpiMetric: "low_stock",
        customIcon: "⚠",
        themeTone: "rose",
      }),
    },

    // Gráficos
    {
      id: "cat-chart-materials-bar",
      category: "charts",
      title: "Gráfico de Estoque por Material",
      description: "Barras comparativas de PLA, PETG, ABS, TPU e especiais.",
      icon: "📊",
      defaultColSpan: 2,
      previewType: "Gráfico de Barras",
      createWidget: () => ({
        id: `chart-materials-${Date.now()}`,
        type: "chart-analytics",
        title: "Estoque por Tipo de Material",
        subtitle: "Peso em gramas disponível",
        colSpan: 2,
        visible: true,
        chartType: "bar-horizontal",
        chartMetric: "material_distribution",
        themeTone: "cyan",
      }),
    },
    {
      id: "cat-chart-fleet-donut",
      category: "charts",
      title: "Gráfico de Capacidade da Frota (Rosca)",
      description: "Distribuição percentual da farm (Imprimindo, Livres, Atenção).",
      icon: "◎",
      defaultColSpan: 1,
      previewType: "Gráfico de Rosca",
      createWidget: () => ({
        id: `chart-fleet-${Date.now()}`,
        type: "chart-analytics",
        title: "Uso da Capacidade da Frota",
        subtitle: "Ocupação em tempo real das impressoras",
        colSpan: 1,
        visible: true,
        chartType: "donut",
        chartMetric: "printer_status",
        themeTone: "emerald",
      }),
    },
    {
      id: "cat-chart-orders-donut",
      category: "charts",
      title: "Gráfico de Situação dos Pedidos",
      description: "Proporção de pedidos aprovados, em produção e entregues.",
      icon: "📈",
      defaultColSpan: 2,
      previewType: "Gráfico Donut",
      createWidget: () => ({
        id: `chart-orders-${Date.now()}`,
        type: "chart-analytics",
        title: "Situação dos Pedidos",
        subtitle: "Aprovados vs Em produção vs Entregues",
        colSpan: 2,
        visible: true,
        chartType: "donut",
        chartMetric: "orders_status",
        themeTone: "violet",
      }),
    },
    {
      id: "cat-chart-brands",
      category: "charts",
      title: "Consumo de Filamento por Marca",
      description: "Ranking das marcas mais usadas (Voolt3D, Creality, Polymaker, etc.).",
      icon: "☷",
      defaultColSpan: 2,
      previewType: "Gráfico de Barras",
      createWidget: () => ({
        id: `chart-brands-${Date.now()}`,
        type: "chart-analytics",
        title: "Marcas de Filamento em Uso",
        subtitle: "Distribuição do estoque por fabricante",
        colSpan: 2,
        visible: true,
        chartType: "bar-horizontal",
        chartMetric: "filament_brand",
        themeTone: "amber",
      }),
    },

    // Tabelas e Listas
    {
      id: "cat-table-production",
      category: "tables",
      title: "Tabela de Produção em Andamento",
      description: "Ordens ativas, previsão de conclusão, bicos e carretéis.",
      icon: "📑",
      defaultColSpan: 2,
      previewType: "Tabela / Lista",
      createWidget: () => ({
        id: `table-production-${Date.now()}`,
        type: "data-table",
        title: "Produção em Andamento",
        subtitle: "Ordens ativas e previsão para liberar máquinas",
        colSpan: 2,
        visible: true,
        tableEntity: "production",
        tableFormat: "compact-list",
        limit: 6,
        themeTone: "blue",
      }),
    },
    {
      id: "cat-table-orders",
      category: "tables",
      title: "Tabela de Orçamentos e Pedidos",
      description: "Histórico de clientes, descrições e valores orçados.",
      icon: "📋",
      defaultColSpan: 2,
      previewType: "Tabela / Lista",
      createWidget: () => ({
        id: `table-orders-${Date.now()}`,
        type: "data-table",
        title: "Orçamentos Recentes",
        subtitle: "Acompanhe clientes e pedidos",
        colSpan: 2,
        visible: true,
        tableEntity: "orders",
        tableFormat: "table",
        limit: 5,
        themeTone: "violet",
      }),
    },
    {
      id: "cat-table-filaments-stock",
      category: "tables",
      title: "Tabela de Insumos e Bobinas",
      description: "Lista detalhada de carretéis, pesos, lotes e fornecedores.",
      icon: "📦",
      defaultColSpan: 4,
      previewType: "Tabela Ampla",
      createWidget: () => ({
        id: `table-filaments-${Date.now()}`,
        type: "data-table",
        title: "Estoque de Filamentos",
        subtitle: "Lista de bobinas em estoque",
        colSpan: 4,
        visible: true,
        tableEntity: "filaments",
        tableFormat: "table",
        limit: 8,
        themeTone: "amber",
      }),
    },

    // Operacional
    {
      id: "cat-op-fleet",
      category: "operational",
      title: "Frota de Equipamentos & Telemetria",
      description: "Painel de status da farm com barras proporcionais.",
      icon: "🖨️",
      defaultColSpan: 2,
      previewType: "Painel de Máquinas",
      createWidget: () => ({
        id: `op-fleet-${Date.now()}`,
        type: "equipment-fleet",
        title: "Estado dos Equipamentos",
        subtitle: "Distribuição atual da farm",
        colSpan: 2,
        visible: true,
        themeTone: "emerald",
      }),
    },
    {
      id: "cat-op-quick",
      category: "operational",
      title: "Painel de Acesso Rápido",
      description: "Atalhos rápidos para Nova Ordem, Orçamento, Materiais e Preços.",
      icon: "⚡",
      defaultColSpan: 1,
      previewType: "Atalhos Rápidos",
      createWidget: () => ({
        id: `op-quick-${Date.now()}`,
        type: "quick-actions",
        title: "Acesso Rápido",
        subtitle: "Atalhos operacionais rápidos",
        colSpan: 1,
        visible: true,
        themeTone: "violet",
      }),
    },
  ];

  const categories = [
    { id: "all", label: "Todos os Cards" },
    { id: "industrial", label: "⚡ Telemetria Industrial" },
    { id: "metrics", label: "📊 Indicadores (KPIs)" },
    { id: "charts", label: "📈 Gráficos Analíticos" },
    { id: "tables", label: "📑 Tabelas & Listas" },
    { id: "operational", label: "🏭 Operacional & Frota" },
  ];

  const filtered = catalogItems.filter((item) => {
    const matchCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

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
        aria-labelledby="catalog-title"
        className="my-auto max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#263246] bg-[#101827] shadow-2xl flex flex-col"
      >
        {/* Header estilo Elementor Widget Drawer */}
        <header className="flex flex-wrap items-center justify-between border-b border-[#263246] bg-[#0a0f1b] px-5 py-3.5 gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#20c997]/15 text-[#20c997] font-bold text-sm border border-[#20c997]/30">
              ＋
            </span>
            <div>
              <h2 id="catalog-title" className="text-sm font-bold text-slate-100 tracking-wide">
                Biblioteca de Cards & Widgets
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                Selecione um bloco modular para adicionar à sua Dashboard personalizada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar card por nome..."
              className="h-8 w-48 sm:w-60 rounded-xl border border-[#263246] bg-[#0a0f1b] px-3 text-xs text-white outline-none focus:border-[#20c997]"
            />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-[#151f30] hover:text-white"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Barra de Categorias */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#263246] bg-[#0d1422] px-5 py-2 text-xs">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`rounded-lg px-3 py-1 font-semibold whitespace-nowrap transition ${
                selectedCategory === c.id
                  ? "bg-[#20c997] text-[#06251e] font-bold shadow-sm"
                  : "text-slate-400 hover:bg-[#151f30] hover:text-white"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Grid de Blocos do Catálogo */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#0a0f1b]/60">
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-xl border border-[#263246] bg-[#101827] p-4 transition-all duration-200 hover:border-[#20c997]/60 hover:bg-[#151f30] hover:shadow-lg hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0a0f1b] text-lg border border-[#263246] text-[#20c997] group-hover:border-[#20c997]/50 group-hover:scale-105 transition-all">
                      {item.icon}
                    </span>
                    <span className="rounded-full bg-[#0a0f1b] px-2 py-0.5 text-[9px] font-mono text-slate-400 border border-[#263246]">
                      {item.defaultColSpan === 1
                        ? "1 Col (25%)"
                        : item.defaultColSpan === 2
                          ? "2 Col (50%)"
                          : "4 Col (100%)"}
                    </span>
                  </div>

                  <h3 className="mt-3 font-bold text-xs text-slate-100 group-hover:text-[#20c997] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">{item.description}</p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[#263246] pt-3">
                  <span className="text-[10px] text-slate-500 font-mono">{item.previewType}</span>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd(item.createWidget());
                      onClose();
                    }}
                    className="flex items-center gap-1 rounded-lg bg-[#20c997]/15 border border-[#20c997]/40 px-2.5 py-1 text-[11px] font-bold text-[#20c997] hover:bg-[#20c997]/30 active:scale-95 transition"
                  >
                    <span>＋</span>
                    <span>Adicionar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-slate-500 text-xs">
              Nenhum card encontrado com este termo de busca.
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="flex items-center justify-between border-t border-[#263246] bg-[#0a0f1b] px-5 py-3 text-xs text-slate-500">
          <span className="font-mono">
            {catalogItems.length} tipos de cards e blocos disponíveis.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#263246] px-3 py-1.5 text-xs text-slate-300 hover:bg-[#151f30]"
          >
            Fechar
          </button>
        </footer>
      </section>
    </div>
  );
}
