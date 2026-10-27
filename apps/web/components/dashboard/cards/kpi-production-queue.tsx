"use client";

import { Layers, Clock, ArrowUpRight, Flame, Settings2 } from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { ProductionRecord } from "@/lib/server-production";
import type { OrderRecord } from "@/lib/server-orders";

interface KpiProductionQueueProps {
  jobs: ProductionRecord[];
  orders: OrderRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

export function KpiProductionQueueCard({
  jobs,
  orders,
  config,
  onOpenSettings,
  isEditing,
}: KpiProductionQueueProps) {
  const queuedJobs = jobs.filter((j) => j.status === "QUEUED");
  const totalQueued = queuedJobs.length;
  
  // Estimate total hours in queue
  const totalMinutes = queuedJobs.reduce((acc, j) => acc + (j.plannedDurationMinutes ?? 90), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  // Count items added today (created today)
  const today = new Date().toISOString().slice(0, 10);
  const addedToday = queuedJobs.filter((j) => j.createdAt?.startsWith(today)).length;

  const alertThreshold = config?.settings?.alertThresholdItems ?? 20;
  const isHighQueue = totalQueued >= alertThreshold;

  return (
    <div className="relative flex flex-col justify-between h-full w-full p-5 bg-[#101827] border border-[#263246] hover:border-[#38bdf8]/40 hover:bg-[#151f30] rounded-xl transition-all duration-200 group shadow-lg shadow-black/20 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#38bdf8]/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight">
              {config?.title || "Fila de Produção"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {config?.subtitle || "Ordens Pendentes"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {config?.settings?.showTodayBadge !== false && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <ArrowUpRight className="w-3 h-3" />+{addedToday} hoje
            </span>
          )}

          {isEditing && (
            <button
              onClick={onOpenSettings}
              className="p-1 rounded-md bg-[#263246]/50 hover:bg-[#263246] text-slate-300 transition-colors"
              title="Configurar Card"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Metric */}
      <div className="my-auto py-2 relative z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
            {totalQueued}
          </span>
          <span className="text-sm font-mono text-slate-400">
            ordens na esteira
          </span>
        </div>

        {/* Queue load indicator */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-300">
          <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span>Carga Estimada:</span>
          <span className="font-mono font-semibold text-slate-100">
            {hours}h {mins}m
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-[#263246]/60 flex items-center justify-between text-[11px] text-slate-400 font-mono relative z-10">
        <div className="flex items-center gap-1 text-slate-400">
          <span>Pedidos pendentes:</span>
          <span className="font-semibold text-slate-200">{orders.filter(o => o.status === "IN_PRODUCTION" || o.status === "DRAFT").length}</span>
        </div>
        {isHighQueue && (
          <div className="flex items-center gap-1 text-amber-400 animate-pulse">
            <Flame className="w-3.5 h-3.5" />
            <span>Fila Elevada</span>
          </div>
        )}
      </div>
    </div>
  );
}
