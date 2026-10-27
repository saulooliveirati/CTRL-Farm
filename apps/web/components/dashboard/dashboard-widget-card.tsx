"use client";

import Link from "next/link";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { OrderRecord } from "@/lib/server-orders";
import type { PrinterRecord } from "@/lib/server-printers";
import type { ProductionRecord } from "@/lib/server-production";
import type { CameraRecord } from "@/lib/server-cameras";
import type { DashboardWidgetConfig } from "./dashboard-types";

import { KpiActivePrintersCard } from "./cards/kpi-active-printers";
import { KpiProductionQueueCard } from "./cards/kpi-production-queue";
import { KpiFilamentStockCard } from "./cards/kpi-filament-stock";
import { KpiEfficiencyCard } from "./cards/kpi-efficiency";
import { PrinterFleetGridCard } from "./cards/printer-fleet-grid";
import { ProductionQueueListCard } from "./cards/production-queue-list";
import { FilamentTelemetryChartCard } from "./cards/filament-telemetry-chart";

interface DashboardWidgetCardProps {
  widget: DashboardWidgetConfig;
  isBuilderMode: boolean;
  printers: PrinterRecord[];
  filaments: FilamentRecord[];
  jobs: ProductionRecord[];
  orders: OrderRecord[];
  cameras?: CameraRecord[];
  now: number;
  onOpenSettings: (widget: DashboardWidgetConfig) => void;
  onOpenDetail?: (metric: string) => void;
  onQuickResize: (widget: DashboardWidgetConfig, cols: 1 | 2 | 3 | 4) => void;
  onMove: (index: number, delta: number) => void;
  onRemove: (id: string) => void;
  index: number;
  totalWidgets: number;
}

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const printerLabels: Record<string, string> = {
  READY: "Disponível",
  PRINTING: "Imprimindo",
  PAUSED: "Pausada",
  ERROR: "Com erro",
  MAINTENANCE: "Manutenção",
  OFFLINE: "Desligada",
};

const printerColors: Record<string, string> = {
  READY: "bg-[#20c997]",
  PRINTING: "bg-sky-400",
  PAUSED: "bg-amber-400",
  ERROR: "bg-rose-400",
  MAINTENANCE: "bg-purple-400",
  OFFLINE: "bg-slate-500",
};

const toneClasses: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  emerald: {
    bg: "bg-[#20c997]/10",
    text: "text-[#20c997]",
    border: "border-[#20c997]/30",
    glow: "shadow-[0_0_20px_rgba(32,201,151,0.25)]",
  },
  cyan: {
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/30",
    glow: "shadow-[0_0_20px_rgba(56,189,248,0.25)]",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    glow: "shadow-[0_0_20px_rgba(59,130,246,0.25)]",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.25)]",
  },
  violet: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-[0_0_20px_rgba(168,85,247,0.25)]",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    glow: "shadow-[0_0_20px_rgba(251,113,133,0.25)]",
  },
  slate: {
    bg: "bg-[#151f30]",
    text: "text-slate-300",
    border: "border-[#263246]",
    glow: "shadow-none",
  },
};

export function DashboardWidgetCard({
  widget,
  isBuilderMode,
  printers,
  filaments,
  jobs,
  orders,
  cameras = [],
  now,
  onOpenSettings,
  onOpenDetail,
  onQuickResize,
  onMove,
  onRemove,
  index,
  totalWidgets,
}: DashboardWidgetCardProps) {
  const tone = toneClasses[widget.themeTone ?? "emerald"] ?? toneClasses.emerald;

  // Cálculos de dados
  const totalWeight = filaments.reduce((sum, item) => sum + item.currentWeightG, 0);
  const totalValue = filaments.reduce(
    (sum, item) =>
      sum +
      (item.price === null ? 0 : (Number(item.price) * item.currentWeightG) / item.initialWeightG),
    0,
  );
  const activeJobs = jobs.filter((job) => ["QUEUED", "PRINTING", "PAUSED"].includes(job.status));
  const queuedJobs = jobs.filter((job) => job.status === "QUEUED");
  const lowStock = filaments.filter((item) => item.currentWeightG < 300);
  const printingPrinters = printers.filter((item) => item.status === "PRINTING");
  const readyPrinters = printers.filter((item) => item.status === "READY");
  const totalRevenue = orders.reduce(
    (sum, item) => sum + Number(item.totalAmount ?? Number(item.unitPrice) * item.quantity),
    0,
  );

  // Mapeamento do grid span (1 col a 4 col)
  const colSpanClass = {
    1: "col-span-12 sm:col-span-6 lg:col-span-3",
    2: "col-span-12 lg:col-span-6",
    3: "col-span-12 lg:col-span-9",
    4: "col-span-12",
  }[widget.colSpan];

  // ================= DELEGAÇÃO PARA CARDS ESPECIALIZADOS MODERNOS =================
  if (widget.type === "kpi-active-printers") {
    return (
      <div className={`relative ${colSpanClass}`}>
        {isBuilderMode && (
          <BuilderItemToolbar
            widget={widget}
            onOpenSettings={onOpenSettings}
            onQuickResize={onQuickResize}
            onMove={onMove}
            onRemove={onRemove}
            index={index}
            total={totalWidgets}
          />
        )}
        <KpiActivePrintersCard printers={printers} onOpenSettings={() => onOpenSettings(widget)} isEditing={isBuilderMode} />
      </div>
    );
  }

  if (widget.type === "kpi-production-queue") {
    return (
      <div className={`relative ${colSpanClass}`}>
        {isBuilderMode && (
          <BuilderItemToolbar
            widget={widget}
            onOpenSettings={onOpenSettings}
            onQuickResize={onQuickResize}
            onMove={onMove}
            onRemove={onRemove}
            index={index}
            total={totalWidgets}
          />
        )}
        <KpiProductionQueueCard jobs={jobs} orders={orders} onOpenSettings={() => onOpenSettings(widget)} isEditing={isBuilderMode} />
      </div>
    );
  }

  if (widget.type === "kpi-filament-stock") {
    return (
      <div className={`relative ${colSpanClass}`}>
        {isBuilderMode && (
          <BuilderItemToolbar
            widget={widget}
            onOpenSettings={onOpenSettings}
            onQuickResize={onQuickResize}
            onMove={onMove}
            onRemove={onRemove}
            index={index}
            total={totalWidgets}
          />
        )}
        <KpiFilamentStockCard filaments={filaments} onOpenSettings={() => onOpenSettings(widget)} isEditing={isBuilderMode} />
      </div>
    );
  }

  if (widget.type === "kpi-efficiency") {
    return (
      <div className={`relative ${colSpanClass}`}>
        {isBuilderMode && (
          <BuilderItemToolbar
            widget={widget}
            onOpenSettings={onOpenSettings}
            onQuickResize={onQuickResize}
            onMove={onMove}
            onRemove={onRemove}
            index={index}
            total={totalWidgets}
          />
        )}
        <KpiEfficiencyCard jobs={jobs} onOpenSettings={() => onOpenSettings(widget)} isEditing={isBuilderMode} />
      </div>
    );
  }

  if (widget.type === "printer-fleet-grid") {
    return (
      <div className={`relative ${colSpanClass}`}>
        {isBuilderMode && (
          <BuilderItemToolbar
            widget={widget}
            onOpenSettings={onOpenSettings}
            onQuickResize={onQuickResize}
            onMove={onMove}
            onRemove={onRemove}
            index={index}
            total={totalWidgets}
          />
        )}
        <PrinterFleetGridCard printers={printers} cameras={cameras} onOpenSettings={() => onOpenSettings(widget)} isEditing={isBuilderMode} />
      </div>
    );
  }

  if (widget.type === "production-queue-list") {
    return (
      <div className={`relative ${colSpanClass}`}>
        {isBuilderMode && (
          <BuilderItemToolbar
            widget={widget}
            onOpenSettings={onOpenSettings}
            onQuickResize={onQuickResize}
            onMove={onMove}
            onRemove={onRemove}
            index={index}
            total={totalWidgets}
          />
        )}
        <ProductionQueueListCard jobs={jobs} orders={orders} onOpenSettings={() => onOpenSettings(widget)} isEditing={isBuilderMode} />
      </div>
    );
  }

  if (widget.type === "filament-telemetry-chart") {
    return (
      <div className={`relative ${colSpanClass}`}>
        {isBuilderMode && (
          <BuilderItemToolbar
            widget={widget}
            onOpenSettings={onOpenSettings}
            onQuickResize={onQuickResize}
            onMove={onMove}
            onRemove={onRemove}
            index={index}
            total={totalWidgets}
          />
        )}
        <FilamentTelemetryChartCard jobs={jobs} onOpenSettings={() => onOpenSettings(widget)} isEditing={isBuilderMode} />
      </div>
    );
  }

  // ================= 1. RENDERIZADOR DE KPI STAT CARD =================
  if (widget.type === "kpi-stat") {
    let value = "0";
    let subnote = "";
    let defaultIcon = "◉";

    switch (widget.kpiMetric) {
      case "filaments_weight":
        value = `${number.format(totalWeight / 1000)} kg`;
        subnote = `${filaments.length} bobinas cadastradas`;
        defaultIcon = "◉";
        break;
      case "filaments_value":
        value = money.format(totalValue);
        subnote = `${filaments.filter((f) => f.price !== null).length} bobinas precificadas`;
        defaultIcon = "R$";
        break;
      case "printers_total":
        value = String(printers.length);
        subnote = `${printingPrinters.length} imprimindo · ${readyPrinters.length} livres`;
        defaultIcon = "▣";
        break;
      case "printers_printing":
        value = String(printingPrinters.length);
        subnote = `${Math.round(printers.length ? (printingPrinters.length / printers.length) * 100 : 0)}% da frota ativa`;
        defaultIcon = "⚙️";
        break;
      case "printers_ready":
        value = String(readyPrinters.length);
        subnote = "Prontas para novos trabalhos";
        defaultIcon = "✓";
        break;
      case "production_active":
        value = String(activeJobs.length);
        subnote = `${queuedJobs.length} ordens na fila`;
        defaultIcon = "▶";
        break;
      case "production_queued":
        value = String(queuedJobs.length);
        subnote = "Aguardando liberação de máquinas";
        defaultIcon = "⏳";
        break;
      case "orders_total":
        value = String(orders.length);
        subnote = `${orders.filter((o) => o.status === "COMPLETED").length} concluídos`;
        defaultIcon = "📑";
        break;
      case "orders_revenue":
        value = money.format(totalRevenue);
        subnote = `Em ${orders.length} pedidos de clientes`;
        defaultIcon = "💵";
        break;
      case "low_stock":
        value = String(lowStock.length);
        subnote = "Bobinas com menos de 300 g";
        defaultIcon = "⚠";
        break;
      default:
        value = String(totalWeight / 1000);
        subnote = "Métrica de monitoramento";
        break;
    }

    const icon = widget.customIcon || defaultIcon;

    return (
      <div className={`relative ${colSpanClass}`}>
        <div
          onClick={() => {
            if (isBuilderMode) onOpenSettings(widget);
            else if (onOpenDetail && widget.kpiMetric) onOpenDetail(widget.kpiMetric);
          }}
          className={`interactive-card group relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
            widget.showBorderGlow ? tone.glow : ""
          } ${
            isBuilderMode
              ? "border-dashed border-[#20c997]/70 bg-[#0a0f1b] cursor-pointer ring-1 ring-[#20c997]/40"
              : "border-[#263246] bg-[#101827] hover:bg-[#151f30] hover:border-[#20c997]/40"
          }`}
        >
          {/* Barra do Construtor Superior quando no Modo Edição */}
          {isBuilderMode && (
            <BuilderItemToolbar
              widget={widget}
              onOpenSettings={onOpenSettings}
              onQuickResize={onQuickResize}
              onMove={onMove}
              onRemove={onRemove}
              index={index}
              total={totalWidgets}
            />
          )}

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400">{widget.title}</p>
              <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
                {value}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 font-medium font-mono">
                {widget.subtitle || subnote}
              </p>
            </div>
            <span
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-bold border ${tone.bg} ${tone.text} ${tone.border}`}
            >
              {icon}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500 border-t border-[#263246] pt-2 font-mono">
            <span>{isBuilderMode ? "Clique para configurar card" : "Card Dinâmico"}</span>
            <span className={`font-semibold ${tone.text}`}>● Ativo</span>
          </div>
        </div>
      </div>
    );
  }

  // ================= 2. RENDERIZADOR DE GRÁFICOS (Rosca, Barras, Área) =================
  if (widget.type === "chart-analytics") {
    return (
      <div className={`relative ${colSpanClass}`}>
        <article
          onClick={() => isBuilderMode && onOpenSettings(widget)}
          className={`interactive-card relative flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
            widget.showBorderGlow ? tone.glow : ""
          } ${
            isBuilderMode
              ? "border-dashed border-[#20c997]/70 bg-[#0a0f1b] cursor-pointer ring-1 ring-[#20c997]/40"
              : "border-[#263246] bg-[#101827] hover:bg-[#151f30] hover:border-[#20c997]/40"
          }`}
        >
          {isBuilderMode && (
            <BuilderItemToolbar
              widget={widget}
              onOpenSettings={onOpenSettings}
              onQuickResize={onQuickResize}
              onMove={onMove}
              onRemove={onRemove}
              index={index}
              total={totalWidgets}
            />
          )}

          <div>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-white">{widget.title}</h3>
                <p className="mt-0.5 text-xs text-slate-500 font-mono">
                  {widget.subtitle || "Visualização gráfica analítica"}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[9px] font-bold border uppercase font-mono ${tone.bg} ${tone.text} ${tone.border}`}
              >
                {widget.chartType || "donut"}
              </span>
            </div>

            {/* Gráfico de Estoque por Material */}
            {widget.chartMetric === "material_distribution" && (
              <RenderMaterialChart filaments={filaments} chartType={widget.chartType} />
            )}

            {/* Gráfico de Status da Frota */}
            {widget.chartMetric === "printer_status" && (
              <RenderFleetStatusChart printers={printers} chartType={widget.chartType} />
            )}

            {/* Gráfico por Marca de Filamento */}
            {widget.chartMetric === "filament_brand" && (
              <RenderBrandChart filaments={filaments} chartType={widget.chartType} />
            )}

            {/* Gráfico de Situação dos Pedidos */}
            {widget.chartMetric === "orders_status" && (
              <RenderOrdersChart orders={orders} chartType={widget.chartType} />
            )}
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 border-t border-[#263246] pt-2 font-mono">
            <span>Tipo: {widget.chartType}</span>
            <span className={tone.text}>Métrica: {widget.chartMetric}</span>
          </div>
        </article>
      </div>
    );
  }

  // ================= 3. RENDERIZADOR DE TABELAS & LISTAS =================
  if (widget.type === "data-table") {
    const limit = widget.limit || 5;

    return (
      <div className={`relative ${colSpanClass}`}>
        <article
          onClick={() => isBuilderMode && onOpenSettings(widget)}
          className={`interactive-card relative overflow-hidden rounded-2xl border transition-all duration-200 ${
            widget.showBorderGlow ? tone.glow : ""
          } ${
            isBuilderMode
              ? "border-dashed border-[#20c997]/70 bg-[#0a0f1b] cursor-pointer ring-1 ring-[#20c997]/40"
              : "border-[#263246] bg-[#101827] hover:border-[#20c997]/40"
          }`}
        >
          {isBuilderMode && (
            <div className="p-2 bg-[#0a0f1b] border-b border-[#263246]">
              <BuilderItemToolbar
                widget={widget}
                onOpenSettings={onOpenSettings}
                onQuickResize={onQuickResize}
                onMove={onMove}
                onRemove={onRemove}
                index={index}
                total={totalWidgets}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#263246] p-4 sm:p-5">
            <div>
              <h3 className="font-bold text-sm text-white">{widget.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500 font-mono">
                {widget.subtitle || "Listagem de registros"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#0a0f1b] px-2.5 py-0.5 text-[10px] font-mono text-slate-400 border border-[#263246]">
                Formato: {widget.tableFormat || "tabela"}
              </span>
              <Link
                href={
                  widget.tableEntity === "production"
                    ? "/production"
                    : widget.tableEntity === "orders"
                      ? "/orders"
                      : widget.tableEntity === "printers"
                        ? "/printers"
                        : "/materials"
                }
                className="text-xs font-semibold text-[#20c997] hover:text-[#1db889] font-mono"
              >
                Abrir tudo →
              </Link>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {/* Tabela de Produção */}
            {widget.tableEntity === "production" && (
              <RenderProductionTable
                jobs={activeJobs.slice(0, limit)}
                format={widget.tableFormat}
                now={now}
              />
            )}

            {/* Tabela de Ordens */}
            {widget.tableEntity === "orders" && (
              <RenderOrdersTable orders={orders.slice(0, limit)} format={widget.tableFormat} />
            )}

            {/* Tabela de Impressoras */}
            {widget.tableEntity === "printers" && (
              <RenderPrintersTable
                printers={printers.slice(0, limit)}
                format={widget.tableFormat}
              />
            )}

            {/* Tabela de Filamentos */}
            {widget.tableEntity === "filaments" && (
              <RenderFilamentsTable
                filaments={filaments.slice(0, limit)}
                format={widget.tableFormat}
              />
            )}
          </div>
        </article>
      </div>
    );
  }

  // ================= 4. RENDERIZADOR DE ESTADO DA FROTA & TELEMETRIA =================
  if (widget.type === "equipment-fleet") {
    const printerCounts = Object.keys(printerLabels).map((status) => ({
      status,
      label: printerLabels[status],
      count: printers.filter((printer) => printer.status === status).length,
    }));

    return (
      <div className={`relative ${colSpanClass}`}>
        <article
          onClick={() => isBuilderMode && onOpenSettings(widget)}
          className={`interactive-card relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
            isBuilderMode
              ? "border-dashed border-[#20c997]/70 bg-[#0a0f1b] cursor-pointer ring-1 ring-[#20c997]/40"
              : "border-[#263246] bg-[#101827] hover:border-[#20c997]/40"
          }`}
        >
          {isBuilderMode && (
            <BuilderItemToolbar
              widget={widget}
              onOpenSettings={onOpenSettings}
              onQuickResize={onQuickResize}
              onMove={onMove}
              onRemove={onRemove}
              index={index}
              total={totalWidgets}
            />
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white">{widget.title}</h3>
              <p className="mt-0.5 text-xs text-slate-500 font-mono">
                Distribuição atual da farm e telemetria
              </p>
            </div>
            <Link
              href="/printers"
              className="text-xs font-semibold text-[#20c997] hover:text-[#1db889] font-mono"
            >
              Ver equipamentos →
            </Link>
          </div>

          {/* Barra de distribuição proporcional */}
          <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-[#0a0f1b] border border-[#263246]">
            {printerCounts
              .filter((item) => item.count > 0)
              .map((item) => (
                <div
                  key={item.status}
                  title={`${item.label}: ${item.count}`}
                  className={`${printerColors[item.status]} h-full transition-all duration-500`}
                  style={{ width: `${(item.count / Math.max(1, printers.length)) * 100}%` }}
                />
              ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {printerCounts.map((item) => (
              <div
                key={item.status}
                className="flex items-center gap-2 rounded-xl bg-[#0a0f1b] p-2.5 border border-[#263246]"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${printerColors[item.status]}`} />
                <span className="truncate text-xs text-slate-400">{item.label}</span>
                <span className="ml-auto text-xs font-bold text-white font-mono">{item.count}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {printers.slice(0, 4).map((printer) => (
              <div
                key={printer.id}
                className="flex items-center gap-3 rounded-xl border border-[#263246] bg-[#0a0f1b] p-3"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${printerColors[printer.status] ?? "bg-slate-500"}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white">{printer.name}</p>
                  <p className="truncate text-[10px] text-slate-500">
                    {printer.manufacturer ?? printer.model ?? "Equipamento"}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#20c997]">
                  {printerLabels[printer.status]}
                </span>
              </div>
            ))}
          </div>
        </article>
      </div>
    );
  }

  // ================= 5. RENDERIZADOR DE ACESSO RÁPIDO =================
  if (widget.type === "quick-actions") {
    const shortcuts = [
      {
        name: "Nova ordem",
        detail: "Inicie ou programe uma impressão",
        href: "/production",
        icon: "▶",
      },
      { name: "Criar orçamento", detail: "Registre um novo pedido", href: "/orders", icon: "＋" },
      {
        name: "Adicionar insumo",
        detail: "Atualize bobinas de filamento",
        href: "/materials",
        icon: "▤",
      },
      { name: "Calcular preço", detail: "Simule custos e margem", href: "/pricing", icon: "R$" },
    ];

    return (
      <div className={`relative ${colSpanClass}`}>
        <article
          onClick={() => isBuilderMode && onOpenSettings(widget)}
          className={`interactive-card relative rounded-2xl border p-4 sm:p-5 transition-all duration-200 ${
            isBuilderMode
              ? "border-dashed border-[#20c997]/70 bg-[#0a0f1b] cursor-pointer ring-1 ring-[#20c997]/40"
              : "border-[#263246] bg-[#101827] hover:border-[#20c997]/40"
          }`}
        >
          {isBuilderMode && (
            <BuilderItemToolbar
              widget={widget}
              onOpenSettings={onOpenSettings}
              onQuickResize={onQuickResize}
              onMove={onMove}
              onRemove={onRemove}
              index={index}
              total={totalWidgets}
            />
          )}

          <h3 className="font-bold text-sm text-white">{widget.title}</h3>
          <p className="mt-0.5 text-xs text-slate-500 font-mono">
            {widget.subtitle || "Atalhos para tarefas comuns"}
          </p>

          <div className="mt-4 space-y-2">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="flex items-center gap-3 rounded-xl border border-[#263246] bg-[#0a0f1b] p-2.5 transition hover:border-[#20c997]/50 hover:bg-[#151f30]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#20c997]/15 text-xs font-bold text-[#20c997] border border-[#20c997]/30">
                  {shortcut.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-slate-200">
                    {shortcut.name}
                  </span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {shortcut.detail}
                  </span>
                </span>
                <span className="text-slate-500">→</span>
              </Link>
            ))}
          </div>
        </article>
      </div>
    );
  }

  return null;
}

// ================= BARRA DE FERRAMENTAS FLUTUANTE DO CONSTRUTOR =================
function BuilderItemToolbar({
  widget,
  onOpenSettings,
  onQuickResize,
  onMove,
  onRemove,
  index,
  total,
}: {
  widget: DashboardWidgetConfig;
  onOpenSettings: (w: DashboardWidgetConfig) => void;
  onQuickResize: (w: DashboardWidgetConfig, c: 1 | 2 | 3 | 4) => void;
  onMove: (idx: number, delta: number) => void;
  onRemove: (id: string) => void;
  index: number;
  total: number;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mb-2.5 flex items-center justify-between rounded-xl border border-[#20c997]/40 bg-[#0a0f1b]/95 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md shadow-lg"
    >
      <div className="flex items-center gap-2 font-bold text-[11px]">
        <span className="text-[#20c997]">⚙</span>
        <span className="truncate max-w-[130px] sm:max-w-none text-slate-100">{widget.title}</span>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Seletor rápido de largura */}
        <div className="flex items-center gap-0.5 rounded-lg bg-[#101827] p-0.5 border border-[#263246]">
          {[1, 2, 3, 4].map((col) => (
            <button
              key={col}
              type="button"
              onClick={() => onQuickResize(widget, col as any)}
              className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md font-mono transition ${
                widget.colSpan === col
                  ? "bg-[#20c997] text-[#06251e] shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title={`${col} Coluna(s) (${col * 25}%)`}
            >
              {col}C
            </button>
          ))}
        </div>

        {/* Mover */}
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(index, -1)}
          className="rounded-lg p-1 text-slate-300 hover:bg-[#151f30] hover:text-[#20c997] disabled:opacity-30 transition"
          title="Mover para esquerda / cima"
        >
          ←
        </button>
        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(index, 1)}
          className="rounded-lg p-1 text-slate-300 hover:bg-[#151f30] hover:text-[#20c997] disabled:opacity-30 transition"
          title="Mover para direita / baixo"
        >
          →
        </button>

        {/* Abrir Configurações */}
        <button
          type="button"
          onClick={() => onOpenSettings(widget)}
          className="rounded-lg bg-[#20c997]/15 px-2.5 py-1 text-[10px] font-bold text-[#20c997] hover:bg-[#20c997]/25 border border-[#20c997]/30 transition"
        >
          Configurar
        </button>

        {/* Remover */}
        <button
          type="button"
          onClick={() => onRemove(widget.id)}
          className="rounded-lg p-1 text-[#fb7185] hover:bg-rose-950/60 transition"
          title="Remover card"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ================= COMPONENTES DE GRÁFICO (DONUT / BARRAS / ÁREA) =================
function RenderMaterialChart({
  filaments,
  chartType = "bar-horizontal",
}: {
  filaments: FilamentRecord[];
  chartType?: string;
}) {
  const materials = Object.entries(
    filaments.reduce<Record<string, number>>((acc, item) => {
      acc[item.material] = (acc[item.material] ?? 0) + item.currentWeightG;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  if (materials.length === 0) {
    return <p className="mt-4 text-xs text-slate-500">Sem dados de estoque.</p>;
  }

  const maxVal = Math.max(...materials.map((m) => m[1]), 1);

  if (chartType === "donut") {
    const totalGrams = materials.reduce((s, m) => s + m[1], 0);
    const colors = ["#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#f43f5e", "#64748b"];

    return (
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-4">
        {/* SVG Donut Chart */}
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            {materials.slice(0, 5).map(([mat, grams], idx) => {
              const pct = (grams / totalGrams) * 100;
              const prevTotal = materials.slice(0, idx).reduce((s, m) => s + m[1], 0);
              const prevPct = (prevTotal / totalGrams) * 100;
              return (
                <circle
                  key={mat}
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={colors[idx % colors.length]}
                  strokeWidth="4"
                  strokeDasharray={`${pct} ${100 - pct}`}
                  strokeDashoffset={`-${prevPct}`}
                  className="transition-all duration-700"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs font-bold text-white">{(totalGrams / 1000).toFixed(1)}</span>
            <span className="text-[8px] text-slate-400">kg</span>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex-1 space-y-1.5 text-xs w-full">
          {materials.slice(0, 5).map(([mat, grams], idx) => (
            <div key={mat} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors[idx % colors.length] }}
                />
                <span className="text-slate-300 truncate">{mat}</span>
              </div>
              <span className="text-slate-400 font-mono">{(grams / 1000).toFixed(2)} kg</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Barras Horizontais
  return (
    <div className="mt-4 space-y-3">
      {materials.slice(0, 5).map(([material, grams]) => (
        <div key={material}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-slate-300 font-medium">{material}</span>
            <span className="text-slate-400 font-mono">{number.format(grams)} g</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-[width] duration-700"
              style={{ width: `${Math.max(4, (grams / maxVal) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderFleetStatusChart({
  printers,
  chartType = "donut",
}: {
  printers: PrinterRecord[];
  chartType?: string;
}) {
  const printing = printers.filter((p) => p.status === "PRINTING").length;
  const ready = printers.filter((p) => p.status === "READY").length;
  const attention = printers.filter((p) =>
    ["ERROR", "MAINTENANCE", "OFFLINE"].includes(p.status),
  ).length;

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {[
        {
          label: "Imprimindo",
          value: printing,
          color: "#38bdf8",
          bg: "bg-sky-400/10 text-sky-400 border-sky-500/30",
        },
        {
          label: "Disponíveis",
          value: ready,
          color: "#20c997",
          bg: "bg-[#20c997]/10 text-[#20c997] border-[#20c997]/30",
        },
        {
          label: "Em Atenção",
          value: attention,
          color: "#f59e0b",
          bg: "bg-amber-400/10 text-amber-400 border-amber-500/30",
        },
      ].map((item) => (
        <div key={item.label} className={`rounded-xl border p-3 text-center ${item.bg}`}>
          <div
            className="mx-auto mb-1.5 h-2 w-2 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <strong className="text-xl font-extrabold text-white font-mono">{item.value}</strong>
          <p className="mt-0.5 text-[10px] text-slate-400 font-mono">{item.label}</p>
          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
            {printers.length ? Math.round((item.value / printers.length) * 100) : 0}%
          </p>
        </div>
      ))}
    </div>
  );
}

function RenderBrandChart({
  filaments,
  chartType = "bar-horizontal",
}: {
  filaments: FilamentRecord[];
  chartType?: string;
}) {
  const brands = Object.entries(
    filaments.reduce<Record<string, number>>((acc, item) => {
      const b = item.brand || "Genérico";
      acc[b] = (acc[b] ?? 0) + item.currentWeightG;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const maxVal = Math.max(...brands.map((b) => b[1]), 1);

  return (
    <div className="mt-4 space-y-3">
      {brands.slice(0, 5).map(([brand, grams]) => (
        <div key={brand}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-slate-300 font-medium">{brand}</span>
            <span className="text-slate-400 font-mono">{number.format(grams)} g</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#0a0f1b] border border-[#263246]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-[#20c997] transition-[width] duration-700"
              style={{ width: `${Math.max(4, (grams / maxVal) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderOrdersChart({
  orders,
  chartType = "donut",
}: {
  orders: OrderRecord[];
  chartType?: string;
}) {
  const total = Math.max(1, orders.length);
  const pending = orders.filter((o) => o.status === "DRAFT").length;
  const inProgress = orders.filter((o) => o.status === "IN_PRODUCTION").length;
  const delivered = orders.filter((o) => o.status === "COMPLETED").length;

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className="rounded-xl bg-[#0a0f1b] p-3 text-center border border-[#263246]">
        <span className="text-xs text-slate-400 font-mono">Pendentes</span>
        <p className="text-lg font-bold text-[#f59e0b] font-mono">{pending}</p>
        <span className="text-[9px] text-slate-500 font-mono">{Math.round((pending / total) * 100)}%</span>
      </div>
      <div className="rounded-xl bg-[#0a0f1b] p-3 text-center border border-[#263246]">
        <span className="text-xs text-slate-400 font-mono">Produzindo</span>
        <p className="text-lg font-bold text-sky-400 font-mono">{inProgress}</p>
        <span className="text-[9px] text-slate-500 font-mono">{Math.round((inProgress / total) * 100)}%</span>
      </div>
      <div className="rounded-xl bg-[#0a0f1b] p-3 text-center border border-[#263246]">
        <span className="text-xs text-slate-400 font-mono">Entregues</span>
        <p className="text-lg font-bold text-[#20c997] font-mono">{delivered}</p>
        <span className="text-[9px] text-slate-500 font-mono">{Math.round((delivered / total) * 100)}%</span>
      </div>
    </div>
  );
}

// ================= COMPONENTES DE TABELA / LISTA (TABELA, COMPACTA, CARDS) =================
function RenderProductionTable({
  jobs,
  format = "compact-list",
  now,
}: {
  jobs: ProductionRecord[];
  format?: string;
  now: number;
}) {
  if (jobs.length === 0) {
    return (
      <p className="text-xs text-slate-500 py-4 text-center font-mono">Nenhuma ordem ativa no momento.</p>
    );
  }

  if (format === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[#263246] text-slate-400 font-mono">
            <tr>
              <th className="pb-2">Trabalho</th>
              <th className="pb-2">Máquina</th>
              <th className="pb-2">Material</th>
              <th className="pb-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#263246]/60 text-slate-300 font-mono">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-[#151f30]/60">
                <td className="py-2.5 font-bold text-white">{job.name}</td>
                <td className="py-2.5 text-slate-400">{job.printer.name}</td>
                <td className="py-2.5 text-[#20c997]">{job.filament.material}</td>
                <td className="py-2.5">
                  <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] text-sky-400 font-semibold">
                    {job.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Lista Compacta
  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <div
          key={job.id}
          className="flex items-center justify-between rounded-xl bg-[#0a0f1b] p-3 border border-[#263246]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/15 text-sky-400 font-bold text-xs shrink-0">
              ▶
            </span>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{job.name}</p>
              <p className="text-[10px] text-slate-500 truncate font-mono">
                {job.printer.name} · {job.filament.material}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#151f30] border border-[#263246] px-2 py-0.5 text-[10px] text-slate-300 font-mono shrink-0">
            {job.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function RenderOrdersTable({
  orders,
  format = "table",
}: {
  orders: OrderRecord[];
  format?: string;
}) {
  if (orders.length === 0) {
    return <p className="text-xs text-slate-500 py-4 text-center font-mono">Nenhum orçamento registrado.</p>;
  }

  return (
    <div className="space-y-2">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between rounded-xl bg-[#0a0f1b] p-3 border border-[#263246]"
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{order.description}</p>
            <p className="text-[10px] text-slate-500 truncate font-mono">{order.customer.name}</p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-bold text-[#20c997] font-mono">
              {money.format(Number(order.totalAmount ?? Number(order.unitPrice) * order.quantity))}
            </span>
            <p className="text-[9px] text-slate-500 font-mono">×{order.quantity} un</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function RenderPrintersTable({
  printers,
  format = "table",
}: {
  printers: PrinterRecord[];
  format?: string;
}) {
  return (
    <div className="space-y-2">
      {printers.map((printer) => (
        <div
          key={printer.id}
          className="flex items-center justify-between rounded-xl bg-[#0a0f1b] p-3 border border-[#263246]"
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${printerColors[printer.status] || "bg-slate-500"}`}
            />
            <div>
              <p className="text-xs font-bold text-white">{printer.name}</p>
              <p className="text-[10px] text-slate-500 font-mono">
                {printer.manufacturer} · {printer.model || "Equipamento"}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {printerLabels[printer.status] || printer.status}
          </span>
        </div>
      ))}
    </div>
  );
}

function RenderFilamentsTable({
  filaments,
  format = "table",
}: {
  filaments: FilamentRecord[];
  format?: string;
}) {
  return (
    <div className="space-y-2">
      {filaments.map((f) => (
        <div
          key={f.id}
          className="flex items-center justify-between rounded-xl bg-[#0a0f1b] p-3 border border-[#263246]"
        >
          <div>
            <p className="text-xs font-bold text-white">
              {f.material} · {f.brand}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              {f.color} · Fornecedor: {f.supplier?.name || "N/A"}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`text-xs font-bold font-mono ${f.currentWeightG < 300 ? "text-[#fb7185]" : "text-[#20c997]"}`}
            >
              {f.currentWeightG} g
            </span>
            <p className="text-[9px] text-slate-500 font-mono">de {f.initialWeightG} g</p>
          </div>
        </div>
      ))}
    </div>
  );
}
