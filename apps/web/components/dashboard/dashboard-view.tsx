"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { OrderRecord } from "@/lib/server-orders";
import type { PrinterRecord } from "@/lib/server-printers";
import type { ProductionRecord } from "@/lib/server-production";
import { defaultWidgets, presetTemplates } from "./dashboard-presets";
import type { DashboardWidgetConfig } from "./dashboard-types";
import { DashboardWidgetCard } from "./dashboard-widget-card";
import { WidgetCatalogModal } from "./widget-catalog-modal";
import { WidgetSettingsModal } from "./widget-settings-modal";
import { useLicensing } from "@/contexts/licensing-context";

let currentTimestamp = 0;
const timerListeners = new Set<() => void>();
let timerId: number | null = null;

function subscribeTimer(onStoreChange: () => void) {
  timerListeners.add(onStoreChange);
  if (timerListeners.size === 1 && typeof window !== "undefined") {
    currentTimestamp = Date.now();
    timerId = window.setInterval(() => {
      currentTimestamp = Date.now();
      timerListeners.forEach((listener) => {
        listener();
      });
    }, 1000);
  }
  return () => {
    timerListeners.delete(onStoreChange);
    if (timerListeners.size === 0 && timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  };
}

function getTimerSnapshot() {
  return currentTimestamp;
}

function getServerTimerSnapshot() {
  return 0;
}

export function DashboardView({
  printers,
  filaments,
  jobs,
  orders,
  userId,
  isAdmin,
}: {
  printers: PrinterRecord[];
  filaments: FilamentRecord[];
  jobs: ProductionRecord[];
  orders: OrderRecord[];
  userId: string;
  isAdmin: boolean;
}) {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(defaultWidgets);
  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidgetConfig | null>(null);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [detailModal, setDetailModal] = useState<string | null>(null);

  // Estados com dados vivos atualizados constantemente para a Dashboard
  const [livePrinters, setLivePrinters] = useState<PrinterRecord[]>(printers);
  const [liveFilaments, setLiveFilaments] = useState<FilamentRecord[]>(filaments);
  const [liveJobs, setLiveJobs] = useState<ProductionRecord[]>(jobs);
  const [liveOrders, setLiveOrders] = useState<OrderRecord[]>(orders);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [autoRefreshIntervalSec, setAutoRefreshIntervalSec] = useState<number>(30);

  useEffect(() => {
    setLivePrinters(printers);
  }, [printers]);
  useEffect(() => {
    setLiveFilaments(filaments);
  }, [filaments]);
  useEffect(() => {
    setLiveJobs(jobs);
  }, [jobs]);
  useEffect(() => {
    setLiveOrders(orders);
  }, [orders]);

  const refreshDashboardData = useCallback(async (silent = true) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [pRes, fRes, jRes, oRes] = await Promise.allSettled([
        fetch("/api/printers").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/filaments").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/production").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/orders").then((r) => (r.ok ? r.json() : null)),
      ]);

      if (pRes.status === "fulfilled" && pRes.value) {
        const val = pRes.value.data ?? pRes.value.printers ?? pRes.value;
        if (Array.isArray(val)) setLivePrinters(val);
      }
      if (fRes.status === "fulfilled" && fRes.value) {
        const val = fRes.value.data ?? fRes.value.filaments ?? fRes.value;
        if (Array.isArray(val)) setLiveFilaments(val);
      }
      if (jRes.status === "fulfilled" && jRes.value) {
        const val = jRes.value.data ?? jRes.value.jobs ?? jRes.value;
        if (Array.isArray(val)) setLiveJobs(val);
      }
      if (oRes.status === "fulfilled" && oRes.value) {
        const val = oRes.value.data ?? oRes.value.orders ?? oRes.value;
        if (Array.isArray(val)) setLiveOrders(val);
      }
      setLastRefreshedAt(new Date());
    } catch {
      // Falhas transitórias de conexão são ignoradas no polling
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isBuilderMode || autoRefreshIntervalSec <= 0) return;
    const interval = setInterval(() => {
      void refreshDashboardData(true);
    }, autoRefreshIntervalSec * 1000);
    return () => clearInterval(interval);
  }, [isBuilderMode, autoRefreshIntervalSec, refreshDashboardData]);

  const now = useSyncExternalStore(subscribeTimer, getTimerSnapshot, getServerTimerSnapshot);

  // Carregar preferências salvas do usuário no localStorage
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(`ctrlfarm-dashboard-builder:${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as DashboardWidgetConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWidgets(parsed);
          return;
        }
      }
    } catch {
      // Ignorar erro de parsing de preferência antiga
    }
  }, [userId]);

  // Persistência
  function persistWidgets(next: DashboardWidgetConfig[], notify = false) {
    setWidgets(next);
    if (userId && typeof window !== "undefined") {
      localStorage.setItem(`ctrlfarm-dashboard-builder:${userId}`, JSON.stringify(next));
    }
    if (notify) {
      setSaveBanner("Layout da dashboard salvo com sucesso!");
      setTimeout(() => setSaveBanner(null), 3000);
    }
  }

  // Operações do Construtor Visual
  function handleAddWidget(newWidget: DashboardWidgetConfig) {
    const next = [...widgets, newWidget];
    persistWidgets(next, true);
  }

  function handleSaveWidgetSettings(updated: DashboardWidgetConfig) {
    const next = widgets.map((w) => (w.id === updated.id ? updated : w));
    persistWidgets(next, true);
    setEditingWidget(null);
  }

  function handleRemoveWidget(id: string) {
    const next = widgets.filter((w) => w.id !== id);
    persistWidgets(next, true);
    setEditingWidget(null);
  }

  function handleQuickResize(widget: DashboardWidgetConfig, cols: 1 | 2 | 3 | 4) {
    const next = widgets.map((w) => (w.id === widget.id ? { ...w, colSpan: cols } : w));
    persistWidgets(next);
  }

  function handleMoveWidget(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= widgets.length) return;
    const next = [...widgets];
    [next[index], next[target]] = [next[target], next[index]];
    persistWidgets(next);
  }

  function handleResetDefault() {
    if (window.confirm("Deseja restaurar o layout padrão da dashboard?")) {
      persistWidgets(defaultWidgets, true);
    }
  }

  function handleApplyTemplate(templateId: string) {
    const found = presetTemplates.find((t) => t.id === templateId);
    if (found) {
      persistWidgets(found.widgets, true);
      setTemplatesOpen(false);
    }
  }

  const { hasFeature, planName } = useLicensing();

  const visibleWidgets = widgets.filter((w) => {
    if (!w.visible) return false;
    if (w.kpiMetric === "production_active" && !hasFeature("production")) return false;
    if (w.id.includes("production") && !hasFeature("production")) return false;
    if (w.id.includes("order") && !hasFeature("orders")) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-[1650px] space-y-6 sm:space-y-8 text-slate-100 pb-16">
      {/* ================= HEADER PRINCIPAL ================= */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              Painel de Controle Central
            </p>
            <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-bold text-emerald-300">
              {planName}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Visão Geral da Farm
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Acompanhe a operação em tempo real com layout 100% personalizável (Elementor / Divi
            Style).
          </p>
        </div>

        {/* Ações do Topo */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indicador e Controle de Atualização Automática Constante */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#070b13] px-3 py-2 text-xs shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 hidden sm:inline text-[11px]">Auto-refresh:</span>
            <select
              value={autoRefreshIntervalSec}
              onChange={(e) => setAutoRefreshIntervalSec(Number(e.target.value))}
              className="bg-transparent text-emerald-400 font-semibold outline-none cursor-pointer text-xs"
              title="Intervalo de atualização automática da Dashboard"
            >
              <option value={30} className="bg-slate-900 text-white">
                30 seg
              </option>
              <option value={60} className="bg-slate-900 text-white">
                1 min
              </option>
              <option value={180} className="bg-slate-900 text-white">
                3 min
              </option>
              <option value={300} className="bg-slate-900 text-white">
                5 min (Padrão)
              </option>
            </select>
            <button
              type="button"
              disabled={isRefreshing}
              onClick={() => void refreshDashboardData(false)}
              className="ml-1 text-slate-400 hover:text-white transition disabled:opacity-50"
              title={`Última atualização às ${lastRefreshedAt.toLocaleTimeString("pt-BR")}. Clique para atualizar agora.`}
            >
              <span className={`inline-block ${isRefreshing ? "animate-spin" : ""}`}>↺</span>
            </button>
          </div>

          {/* Botão de Ativação do Construtor Visual */}
          <button
            type="button"
            onClick={() => setIsBuilderMode(!isBuilderMode)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm border ${
              isBuilderMode
                ? "border-emerald-400 bg-emerald-400 text-slate-950 ring-2 ring-emerald-400/50"
                : "border-slate-700 bg-slate-800 text-slate-200 hover:border-emerald-400 hover:text-white"
            }`}
          >
            <span>{isBuilderMode ? "✓ Concluir Edição" : "🎨 Personalizar Layout"}</span>
          </button>

          <Link
            href="/production"
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow"
          >
            ＋ Nova produção
          </Link>
        </div>
      </header>

      {/* ================= BARRA DE FERRAMENTAS DO CONSTRUTOR (ELEMENTOR / DIVI STYLE) ================= */}
      {isBuilderMode && (
        <section className="animate-in fade-in zoom-in-95 rounded-2xl border border-emerald-500/50 bg-[#0d1624] p-4 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400 text-lg border border-emerald-500/40">
                🛠️
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">Modo Construtor Visual Ativo</h3>
                  <span className="rounded-full bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-800">
                    Live Page Builder
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Clique em qualquer card para configurar suas métricas, formato de tabela, tipo de
                  gráfico ou largura.
                </p>
              </div>
            </div>

            {/* Ações do Construtor */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCatalogOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shadow"
              >
                <span>＋</span>
                <span>Adicionar Card / Bloco</span>
              </button>

              <button
                type="button"
                onClick={() => setTemplatesOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition"
              >
                <span>📋</span>
                <span>Modelos Prontos</span>
              </button>

              <button
                type="button"
                onClick={handleResetDefault}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                title="Restaurar layout de fábrica"
              >
                ↺ Padrão
              </button>

              <button
                type="button"
                onClick={() => persistWidgets(widgets, true)}
                className="rounded-xl bg-emerald-950 border border-emerald-700/60 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900 transition"
              >
                💾 Salvar
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Banner de Feedback ao Salvar */}
      {saveBanner && (
        <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-emerald-500/60 bg-emerald-950/80 p-3 text-xs font-semibold text-emerald-300 text-center shadow-lg">
          ✓ {saveBanner}
        </div>
      )}

      {/* ================= GRADE PRINCIPAL DE 12 COLUNAS DE WIDGETS ================= */}
      {visibleWidgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center">
          <p className="text-base font-bold text-white">Nenhum card visível na dashboard</p>
          <p className="mt-1 text-xs text-slate-400">
            Adicione novos cartões usando o catálogo ou restaure o modelo padrão.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setCatalogOpen(true)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950"
            >
              ＋ Adicionar Card
            </button>
            <button
              type="button"
              onClick={handleResetDefault}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-300"
            >
              Restaurar Padrão
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4 sm:gap-5">
          {visibleWidgets.map((widget, index) => (
            <DashboardWidgetCard
              key={widget.id}
              widget={widget}
              isBuilderMode={isBuilderMode}
              printers={livePrinters}
              filaments={liveFilaments}
              jobs={liveJobs}
              orders={liveOrders}
              now={now}
              onOpenSettings={(w) => setEditingWidget(w)}
              onOpenDetail={(metric) => setDetailModal(metric)}
              onQuickResize={handleQuickResize}
              onMove={handleMoveWidget}
              onRemove={handleRemoveWidget}
              index={index}
              totalWidgets={visibleWidgets.length}
            />
          ))}
        </div>
      )}

      {/* ================= MODAL DE DETALHES DE MÉTRICA ================= */}
      {detailModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailModal(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-detail-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Inspeção da Métrica
                </p>
                <h2 id="dashboard-detail-title" className="mt-1 text-xl font-bold text-white">
                  Detalhes Operacionais
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                aria-label="Fechar"
                className="text-2xl text-slate-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {detailModal.includes("filament") && (
                <div className="space-y-3 py-3">
                  <p className="text-xs text-slate-400">
                    Total de {filaments.length} bobinas cadastradas no estoque.
                  </p>
                  {filaments.slice(0, 10).map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-2 text-xs">
                      <span className="font-semibold text-white">
                        {f.material} · {f.brand} ({f.color})
                      </span>
                      <span className="font-mono text-emerald-400">{f.currentWeightG} g</span>
                    </div>
                  ))}
                </div>
              )}
              {detailModal.includes("printer") && (
                <div className="space-y-3 py-3">
                  <p className="text-xs text-slate-400">
                    Total de {printers.length} impressoras na farm.
                  </p>
                  {printers.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 text-xs">
                      <span className="font-semibold text-white">
                        {p.name} ({p.manufacturer} {p.model})
                      </span>
                      <span className="font-mono text-slate-400">{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {detailModal.includes("production") && (
                <div className="space-y-3 py-3">
                  <p className="text-xs text-slate-400">
                    Total de {jobs.length} ordens de produção registradas.
                  </p>
                  {jobs.slice(0, 8).map((j) => (
                    <div key={j.id} className="flex items-center justify-between py-2 text-xs">
                      <span className="font-semibold text-white">
                        {j.name} · {j.printer.name}
                      </span>
                      <span className="font-mono text-blue-400">{j.status}</span>
                    </div>
                  ))}
                </div>
              )}
              {detailModal.includes("order") && (
                <div className="space-y-3 py-3">
                  <p className="text-xs text-slate-400">
                    Total de {orders.length} pedidos e orçamentos.
                  </p>
                  {orders.slice(0, 8).map((o) => (
                    <div key={o.id} className="flex items-center justify-between py-2 text-xs">
                      <span className="font-semibold text-white">
                        {o.description} · {o.customer.name}
                      </span>
                      <span className="font-mono text-emerald-400">
                        R$ {Number(o.totalAmount ?? Number(o.unitPrice) * o.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {detailModal.includes("low_stock") && (
                <div className="space-y-3 py-3">
                  <p className="text-xs text-amber-300">
                    Bobinas com menos de 300g precisando de reposição:
                  </p>
                  {filaments
                    .filter((f) => f.currentWeightG < 300)
                    .map((f) => (
                      <div key={f.id} className="flex items-center justify-between py-2 text-xs">
                        <span className="font-semibold text-white">
                          {f.material} · {f.brand} ({f.color})
                        </span>
                        <span className="font-mono text-rose-400">
                          {f.currentWeightG} g restantes
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ================= MODAL DO CONSTRUTOR: CONFIGURADOR DO CARD (ELEMENTOR STYLE) ================= */}
      {editingWidget && (
        <WidgetSettingsModal
          widget={editingWidget}
          onSave={handleSaveWidgetSettings}
          onClose={() => setEditingWidget(null)}
          onRemove={handleRemoveWidget}
        />
      )}

      {/* ================= MODAL DO CONSTRUTOR: CATÁLOGO DE WIDGETS ================= */}
      {catalogOpen && (
        <WidgetCatalogModal onAdd={handleAddWidget} onClose={() => setCatalogOpen(false)} />
      )}

      {/* ================= MODAL DE MODELOS PRÉ-DEFINIDOS (TEMPLATES) ================= */}
      {templatesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTemplatesOpen(false);
          }}
        >
          <section className="my-auto max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-[#0f1422] p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-white">Modelos Prontos de Dashboard</h3>
                <p className="text-xs text-slate-400">
                  Carregue um template predefinido adaptado para a sua necessidade operacional.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplatesOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {presetTemplates.map((template) => (
                <div
                  key={template.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-800 bg-[#070b13] p-4 hover:border-emerald-500/50 hover:bg-[#0b101c] transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{template.icon}</span>
                      <h4 className="font-bold text-sm text-white">{template.name}</h4>
                    </div>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                      {template.description}
                    </p>
                    <span className="mt-3 block text-[10px] text-emerald-400 font-mono">
                      {template.widgets.length} cards inclusos
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(template.id)}
                    className="mt-4 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/40 transition"
                  >
                    Aplicar este Modelo
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
