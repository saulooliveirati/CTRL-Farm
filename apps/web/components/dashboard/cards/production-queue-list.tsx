"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Layers,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Settings2,
  PlusCircle,
  Play,
  Pause,
} from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { ProductionRecord } from "@/lib/server-production";
import type { OrderRecord } from "@/lib/server-orders";

interface ProductionQueueListProps {
  jobs: ProductionRecord[];
  orders?: OrderRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

export function ProductionQueueListCard({
  jobs = [],
  orders = [],
  config,
  onOpenSettings,
  isEditing,
}: ProductionQueueListProps) {
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Apenas ordens ativas ou na fila
  const activeJobs = useMemo(() => {
    return jobs.filter((j) => j.status === "QUEUED" || j.status === "PRINTING" || j.status === "PAUSED");
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    return activeJobs.filter((job) => {
      if (statusFilter !== "ALL" && job.status !== statusFilter) return false;
      return true;
    });
  }, [activeJobs, statusFilter]);

  const totalMinutes = useMemo(() => {
    return activeJobs.reduce((acc, j) => acc + (j.plannedDurationMinutes ?? 90), 0);
  }, [activeJobs]);

  const totalWeightG = useMemo(() => {
    return activeJobs.reduce((acc, j) => acc + (j.plannedWeightG ?? 0), 0);
  }, [activeJobs]);

  return (
    <div className="relative flex flex-col h-full w-full p-5 bg-[#101827] border border-[#263246] hover:border-sky-500/40 rounded-xl transition-all duration-200 group shadow-lg shadow-black/20 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-10 w-64 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#263246]/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-slate-100 tracking-tight">
                {config?.title || "Fila de Produção Prioritária"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30">
                {activeJobs.length} {activeJobs.length === 1 ? "Ordem" : "Ordens"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {config?.subtitle || "Ordens na esteira de impressão e alocação de insumos"}
            </p>
          </div>
        </div>

        {/* Filters and New Button */}
        <div className="flex items-center gap-2">
          <Link
            href="/production"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nova Ordem</span>
          </Link>

          {isEditing && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-[#263246]/60 hover:bg-[#263246] text-slate-300 transition-colors"
              title="Configurar Card"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Summary Mini KPIs */}
      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="p-2.5 rounded-lg bg-[#0a0f1b]/70 border border-[#263246]/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            Tempo Estimado
          </span>
          <span className="text-xs font-mono font-semibold text-slate-200">
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-[#0a0f1b]/70 border border-[#263246]/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#20c997]" />
            Insumo Total
          </span>
          <span className="text-xs font-mono font-semibold text-slate-200">
            {(totalWeightG / 1000).toFixed(2)} kg
          </span>
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-[#263246] scrollbar-track-transparent">
        {activeJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center my-auto">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-3">
              <Layers className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-100">Fila de Produção Livre</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1 mb-4">
              Nenhuma ordem de impressão aguardando no momento. Adicione novas ordens para planejar a esteira.
            </p>
            <Link
              href="/production"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition shadow-lg shadow-sky-500/20"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Criar Ordem de Produção
            </Link>
          </div>
        ) : (
          filteredJobs.map((job, idx) => {
            const isPrinting = job.status === "PRINTING";
            const isPaused = job.status === "PAUSED";
            const duration = job.plannedDurationMinutes ?? 90;
            const h = Math.floor(duration / 60);
            const m = duration % 60;
            const material = job.filament?.material || "PLA";
            const color = job.filament?.color || "Padrão";

            return (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0d1424] border border-[#263246] hover:border-sky-500/40 hover:bg-[#121c2e] transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Position number */}
                  <span className="w-6 h-6 rounded-lg bg-[#0a0f1b] border border-[#263246] flex items-center justify-center text-[10px] font-mono font-bold text-slate-400 shrink-0">
                    #{idx + 1}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href="/production"
                        className="text-xs font-semibold text-slate-200 hover:text-sky-400 transition truncate"
                      >
                        {job.name}
                      </Link>
                      {job.order?.description && (
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          ({job.order.description})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                      <span className="text-sky-400 font-semibold">{material}</span>
                      <span>•</span>
                      <span>{color}</span>
                      <span>•</span>
                      <span>{job.plannedWeightG ?? 0}g</span>
                      <span>•</span>
                      <span className="text-slate-300">{job.printer?.name ?? "Aguardando Alocação"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono">
                    <span className="text-xs font-semibold text-slate-200">
                      {h > 0 ? `${h}h ` : ""}{m}m
                    </span>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                      isPrinting
                        ? "bg-[#20c997]/10 text-[#20c997] border-[#20c997]/30"
                        : isPaused
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                    }`}
                  >
                    {isPrinting ? "Imprimindo" : isPaused ? "Pausada" : "Na Fila"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer link */}
      <div className="pt-3 border-t border-[#263246]/60 flex items-center justify-between text-xs text-slate-400 relative z-10">
        <span>Ordens ativas: <strong className="text-slate-200">{activeJobs.length}</strong></span>
        <Link
          href="/production"
          className="text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1 transition"
        >
          <span>Ver todas as ordens</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
