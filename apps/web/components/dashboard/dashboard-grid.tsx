"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  SlidersHorizontal,
  GripVertical,
  Plus,
  RotateCcw,
  Check,
  X,
  Save,
  Eye,
  Settings2,
  RefreshCw,
  Radio,
  Sparkles,
  LayoutDashboard,
  Layers,
} from "lucide-react";
import type { Layout } from "react-grid-layout";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import type { CardConfig, CardId } from "@/types/dashboard-grid";
import type { PrinterRecord } from "@/lib/server-printers";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { ProductionRecord } from "@/lib/server-production";
import type { OrderRecord } from "@/lib/server-orders";
import type { CameraRecord } from "@/lib/server-cameras";

import { KpiActivePrintersCard } from "./cards/kpi-active-printers";
import { KpiProductionQueueCard } from "./cards/kpi-production-queue";
import { KpiFilamentStockCard } from "./cards/kpi-filament-stock";
import { KpiEfficiencyCard } from "./cards/kpi-efficiency";
import { PrinterFleetGridCard } from "./cards/printer-fleet-grid";
import { ProductionQueueListCard } from "./cards/production-queue-list";
import { FilamentTelemetryChartCard } from "./cards/filament-telemetry-chart";
import { CardManagerDrawer } from "./card-manager-drawer";
import { CardConfigModal } from "./card-config-modal";

// Dynamic import of ResponsiveGridInner with { ssr: false } to prevent SSR hydration conflicts
const ResponsiveGridContainer = dynamic(
  () => import("./responsive-grid-inner"),
  { ssr: false }
);

interface DashboardGridProps {
  printers: PrinterRecord[];
  filaments: FilamentRecord[];
  jobs: ProductionRecord[];
  orders: OrderRecord[];
  cameras?: CameraRecord[];
  userId?: string;
  isAdmin?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefreshedAt?: Date;
}

export function DashboardGrid({
  printers,
  filaments,
  jobs,
  orders,
  cameras = [],
  userId = "default",
  isAdmin = true,
  onRefresh,
  isRefreshing = false,
  lastRefreshedAt,
}: DashboardGridProps) {
  const {
    isEditing,
    setIsEditing,
    layouts,
    cardsConfig,
    isSaving,
    lastSavedAt,
    handleLayoutChange,
    toggleCardVisibility,
    updateCardConfig,
    resetToDefaultLayout,
    cancelEdit,
    saveLayout,
  } = useDashboardLayout(userId);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<CardId | null>(null);

  // Render card component based on ID
  const renderCardContent = (cardId: CardId, config: CardConfig) => {
    switch (cardId) {
      case "kpi-active-printers":
        return (
          <KpiActivePrintersCard
            printers={printers}
            config={config}
            onOpenSettings={() => setEditingCardId(cardId)}
            isEditing={isEditing}
          />
        );
      case "kpi-production-queue":
        return (
          <KpiProductionQueueCard
            jobs={jobs}
            orders={orders}
            config={config}
            onOpenSettings={() => setEditingCardId(cardId)}
            isEditing={isEditing}
          />
        );
      case "kpi-filament-stock":
        return (
          <KpiFilamentStockCard
            filaments={filaments}
            config={config}
            onOpenSettings={() => setEditingCardId(cardId)}
            isEditing={isEditing}
          />
        );
      case "kpi-efficiency":
        return (
          <KpiEfficiencyCard
            jobs={jobs}
            config={config}
            onOpenSettings={() => setEditingCardId(cardId)}
            isEditing={isEditing}
          />
        );
      case "printer-fleet-grid":
        return (
          <PrinterFleetGridCard
            printers={printers}
            cameras={cameras}
            config={config}
            onOpenSettings={() => setEditingCardId(cardId)}
            isEditing={isEditing}
          />
        );
      case "production-queue-list":
        return (
          <ProductionQueueListCard
            jobs={jobs}
            orders={orders}
            config={config}
            onOpenSettings={() => setEditingCardId(cardId)}
            isEditing={isEditing}
          />
        );
      case "filament-telemetry-chart":
        return (
          <FilamentTelemetryChartCard
            jobs={jobs}
            config={config}
            onOpenSettings={() => setEditingCardId(cardId)}
            isEditing={isEditing}
          />
        );
      default:
        return null;
    }
  };

  // Only render cards that are marked visible
  const visibleCards = useMemo(() => {
    return Object.values(cardsConfig).filter((c) => c.visible);
  }, [cardsConfig]);

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0a0f1b] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Admin Control Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#101827] border border-[#263246] shadow-xl relative overflow-hidden">
        {/* Subtle decorative background gradient */}
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-[#20c997]/5 to-transparent pointer-events-none" />

        {/* Title and Telemetry Status */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="p-2.5 rounded-xl bg-[#20c997]/10 text-[#20c997] border border-[#20c997]/20">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-100">
                Painel Operacional CTRL-Farm
              </h1>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-[#20c997] border border-[#20c997]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20c997] animate-pulse" />
                TELEMETRIA ATIVA
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Design System Industrial Dark • Grade Dinâmica & Modular
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap relative z-10">
          {/* Live Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="px-3 py-2 rounded-xl bg-[#0a0f1b] hover:bg-[#151f30] text-slate-300 hover:text-slate-100 border border-[#263246] text-xs font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Atualizar Dados Agora"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#20c997]" : ""}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          )}

          {/* Mode Switching: Normal vs Editing Mode */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl bg-[#151f30] hover:bg-[#1d2b42] text-slate-100 hover:text-[#20c997] border border-[#263246] hover:border-[#20c997]/40 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#20c997]" />
              <span>Personalizar Painel</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap animate-in fade-in">
              <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-medium flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Modo de Edição</span>
              </div>

              {/* Drawer Button */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-3 py-2 rounded-xl bg-[#151f30] hover:bg-[#1c2a42] text-slate-200 border border-[#263246] text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#20c997]" />
                <span>Adicionar/Ocultar Cards</span>
              </button>

              {/* Reset to Default */}
              <button
                onClick={resetToDefaultLayout}
                className="px-3 py-2 rounded-xl bg-[#151f30] hover:bg-[#1c2a42] text-slate-300 border border-[#263246] text-xs font-medium transition-colors flex items-center gap-1.5"
                title="Restaurar Padrão de Fábrica"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Restaurar Padrão</span>
              </button>

              {/* Cancel Changes */}
              <button
                onClick={cancelEdit}
                className="px-3 py-2 rounded-xl bg-[#1e1520] hover:bg-rose-950/40 text-rose-300 border border-rose-900/50 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancelar</span>
              </button>

              {/* Save Layout Button */}
              <button
                onClick={saveLayout}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#20c997] hover:bg-[#1db889] text-[#06251e] text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-[#20c997]/25 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Salvando..." : "Salvar Alterações"}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Editing Mode Instruction Banner */}
      {isEditing && (
        <div className="p-3 rounded-xl bg-[#151f30] border border-[#20c997]/30 text-slate-200 text-xs flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#20c997] shrink-0" />
            <span>
              Arraste os cards pela barra superior para reposicionar ou utilize a alça inferior direita de cada card para redimensionar.
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="text-[#20c997] hover:underline font-mono text-xs shrink-0"
          >
            Gerenciar Cards →
          </button>
        </div>
      )}

      {/* Grid Canvas */}
      <main className="w-full">
        <ResponsiveGridContainer
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          isDraggable={isEditing}
          isResizable={isEditing}
        >
          {visibleCards.map((card) => (
            <div
              key={card.id}
              className={`relative h-full w-full rounded-xl transition-shadow ${
                isEditing
                  ? "ring-1 ring-[#20c997]/40 shadow-xl shadow-black/40 group/griditem"
                  : ""
              }`}
            >
              {/* Drag Handle Bar when editing */}
              {isEditing && (
                <div className="absolute top-2 left-2 right-2 z-30 flex items-center justify-between px-2 py-1 bg-[#0a0f1b]/90 border border-[#20c997]/40 rounded-lg backdrop-blur-md text-[10px] font-mono text-slate-300">
                  <div className="drag-handle flex items-center gap-1.5 cursor-grab active:cursor-grabbing text-[#20c997] font-semibold">
                    <GripVertical className="w-3.5 h-3.5" />
                    <span>Mover {card.title}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingCardId(card.id)}
                      className="p-1 rounded hover:bg-[#263246] text-slate-300 hover:text-[#20c997] transition-colors"
                      title="Configurar"
                    >
                      <Settings2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => toggleCardVisibility(card.id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Ocultar Card"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Render specific Card */}
              <div className="h-full w-full">
                {renderCardContent(card.id, card)}
              </div>
            </div>
          ))}
        </ResponsiveGridContainer>
      </main>

      {/* Slide-over Drawer: Card Manager */}
      <CardManagerDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        cardsConfig={cardsConfig}
        onToggleVisibility={toggleCardVisibility}
        onOpenSettings={(id) => {
          setDrawerOpen(false);
          setEditingCardId(id);
        }}
      />

      {/* Modal: Card Configuration */}
      <CardConfigModal
        cardId={editingCardId}
        config={editingCardId ? cardsConfig[editingCardId] : null}
        isOpen={editingCardId !== null}
        onClose={() => setEditingCardId(null)}
        onSave={updateCardConfig}
      />
    </div>
  );
}
