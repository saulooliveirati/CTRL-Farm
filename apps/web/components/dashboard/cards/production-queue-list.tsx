"use client";

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

// Fallback demo queue items if DB has no active jobs
const DEMO_JOBS = [
  {
    id: "job-demo-1",
    name: "Gabinete Eletrônico v2 (Tampa + Base)",
    orderRef: "PED-2026-004",
    material: "PETG",
    color: "Preto Fosco",
    durationMinutes: 225, // 3h 45m
    priority: "HIGH",
    printerName: "Bambu Lab X1-Carbon #01",
    weightG: 180,
    status: "PRINTING",
  },
  {
    id: "job-demo-2",
    name: "Engrenagem Helicoidal de Alta Resistência",
    orderRef: "PED-2026-005",
    material: "ABS",
    color: "Cinza Industrial",
    durationMinutes: 160, // 2h 40m
    priority: "HIGH",
    printerName: "Voron 2.4 R2 350",
    weightG: 95,
    status: "PRINTING",
  },
  {
    id: "job-demo-3",
    name: "Suporte de Câmera Articulado",
    orderRef: "PED-2026-006",
    material: "PLA",
    color: "Verde Esmeralda",
    durationMinutes: 90, // 1h 30m
    priority: "MEDIUM",
    printerName: "Aguardando Alocação",
    weightG: 65,
    status: "QUEUED",
  },
  {
    id: "job-demo-4",
    name: "Chassi Drone FPV 5 Polegadas",
    orderRef: "PED-2026-007",
    material: "Resina",
    color: "Tough Gray",
    durationMinutes: 310, // 5h 10m
    priority: "MEDIUM",
    printerName: "Anycubic Mono X",
    weightG: 140,
    status: "QUEUED",
  },
  {
    id: "job-demo-5",
    name: "Gaxeta Flexível de Vedação",
    orderRef: "PED-2026-008",
    material: "TPU",
    color: "Laranja",
    durationMinutes: 120, // 2h 00m
    priority: "LOW",
    printerName: "Prusa MK4 #03",
    weightG: 45,
    status: "QUEUED",
  },
  {
    id: "job-demo-6",
    name: "Caixa Organizadora Modular GridFinity",
    orderRef: "PED-2026-009",
    material: "PLA",
    color: "Branco Neve",
    durationMinutes: 180, // 3h 00m
    priority: "LOW",
    printerName: "Aguardando Alocação",
    weightG: 120,
    status: "QUEUED",
  },
];

export function ProductionQueueListCard({
  jobs,
  orders = [],
  config,
  onOpenSettings,
  isEditing,
}: ProductionQueueListProps) {
  const [selectedPolymer, setSelectedPolymer] = useState<string>(
    config?.settings?.filterPolymer ?? "ALL"
  );
  const maxItems = config?.settings?.maxItems ?? 6;

  // Adapt real jobs or use demos
  const queueItems = useMemo(() => {
    if (jobs && jobs.length > 0) {
      return jobs.slice(0, maxItems).map((j, index) => {
        const duration = j.plannedDurationMinutes ?? 120;
        const mat = j.filament?.material ?? (index % 2 === 0 ? "PLA" : "PETG");
        const prio = index < 2 ? "HIGH" : index < 4 ? "MEDIUM" : "LOW";
        return {
          id: j.id,
          name: j.name,
          orderRef: j.order?.description ?? `JOB-${j.id.slice(0, 6)}`,
          material: mat,
          color: j.filament?.color ?? "Natural",
          durationMinutes: duration,
          priority: prio,
          printerName: j.printer?.name ?? "Fila de Espera",
          weightG: j.plannedWeightG,
          status: j.status,
        };
      });
    }
    return DEMO_JOBS.slice(0, maxItems);
  }, [jobs, maxItems]);

  const filteredItems = useMemo(() => {
    if (selectedPolymer === "ALL") return queueItems;
    return queueItems.filter((i) => i.material === selectedPolymer);
  }, [queueItems, selectedPolymer]);

  const getPolymerBadge = (material: string) => {
    switch (material.toUpperCase()) {
      case "PLA":
        return "bg-[#20c997]/10 text-[#20c997] border-[#20c997]/30";
      case "PETG":
        return "bg-sky-500/10 text-sky-400 border-sky-500/30";
      case "ABS":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "RESINA":
        return "bg-pink-500/10 text-pink-400 border-pink-500/30";
      case "TPU":
        return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      default:
        return "bg-slate-500/10 text-slate-300 border-slate-500/30";
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return {
          label: "Alta",
          class: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        };
      case "MEDIUM":
        return {
          label: "Média",
          class: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        };
      default:
        return {
          label: "Baixa",
          class: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        };
    }
  };

  return (
    <div className="relative flex flex-col h-full w-full p-5 bg-[#101827] border border-[#263246] hover:border-[#20c997]/40 rounded-xl transition-all duration-200 group shadow-lg shadow-black/20 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#38bdf8]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#263246]/60 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
              {config?.title || "Fila de Impressão Prioritária"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {config?.subtitle || "Ordens na Esteira de Produção"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Polymer Filter */}
          <select
            value={selectedPolymer}
            onChange={(e) => setSelectedPolymer(e.target.value)}
            className="bg-[#0a0f1b] border border-[#263246] text-slate-300 text-xs rounded-lg px-2 py-1 outline-none font-mono"
          >
            <option value="ALL">Polímeros (Todos)</option>
            <option value="PLA">PLA</option>
            <option value="PETG">PETG</option>
            <option value="ABS">ABS</option>
            <option value="Resina">Resina</option>
            <option value="TPU">TPU</option>
          </select>

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

      {/* Items List */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2 scrollbar-thin scrollbar-thumb-[#263246] scrollbar-track-transparent">
        {filteredItems.map((item) => {
          const hours = Math.floor(item.durationMinutes / 60);
          const mins = item.durationMinutes % 60;
          const prio = getPriorityBadge(item.priority);

          return (
            <div
              key={item.id}
              className="p-3 bg-[#0d1424] border border-[#263246] hover:border-[#20c997]/40 rounded-xl transition-all duration-200 hover:bg-[#121c2e] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group/item"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-100 truncate max-w-[200px] sm:max-w-[260px]">
                    {item.name}
                  </span>

                  {/* Polymer Badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getPolymerBadge(
                      item.material
                    )}`}
                  >
                    {item.material}
                  </span>

                  {/* Priority Tag */}
                  {config?.settings?.showPriorityTag !== false && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border ${prio.class}`}
                    >
                      {prio.label}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-1">
                  <span>{item.orderRef}</span>
                  <span>•</span>
                  <span>{item.weightG}g</span>
                  <span>•</span>
                  <span className="text-slate-300 truncate">{item.printerName}</span>
                </div>
              </div>

              {/* Estimated Time and Quick Status */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[#263246]/40">
                <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {hours}h {mins}m
                  </span>
                </div>

                <button
                  className="px-2 py-1 rounded bg-[#20c997]/10 hover:bg-[#20c997]/20 text-[#20c997] text-[11px] font-medium transition-colors border border-[#20c997]/30 flex items-center gap-1 group-hover/item:border-[#20c997]"
                  title="Abrir Ordem"
                >
                  <span>Ver</span>
                  <ArrowRight className="w-3 h-3 group-hover/item:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Summary */}
      <div className="mt-3 pt-2.5 border-t border-[#263246]/60 flex items-center justify-between text-[11px] text-slate-400 font-mono relative z-10">
        <div>
          <span>Exibindo </span>
          <span className="text-slate-200 font-semibold">{filteredItems.length} ordens</span>
        </div>
        <div className="text-[10px] text-slate-500">
          Prioridade Dinâmica
        </div>
      </div>
    </div>
  );
}
