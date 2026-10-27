"use client";

import { Printer, Activity, CheckCircle2, AlertTriangle, Settings2 } from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { PrinterRecord } from "@/lib/server-printers";

interface KpiActivePrintersProps {
  printers: PrinterRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

export function KpiActivePrintersCard({
  printers,
  config,
  onOpenSettings,
  isEditing,
}: KpiActivePrintersProps) {
  const total = printers.length;
  const printing = printers.filter((p) => p.status === "PRINTING").length;
  const ready = printers.filter((p) => p.status === "READY").length;
  const maintenance = printers.filter(
    (p) => p.status === "MAINTENANCE" || p.status === "ERROR" || p.status === "PAUSED"
  ).length;

  const occupancy = total > 0 ? Math.round((printing / total) * 100) : 0;
  const targetOccupancy = config?.settings?.targetOccupancy ?? 80;
  const isOptimal = occupancy >= targetOccupancy;

  return (
    <div className="relative flex flex-col justify-between h-full w-full p-5 bg-[#101827] border border-[#263246] hover:border-[#20c997]/40 hover:bg-[#151f30] rounded-xl transition-all duration-200 group shadow-lg shadow-black/20 overflow-hidden">
      {/* Background neon ambient highlight */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#20c997]/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-[#20c997]/10 border border-[#20c997]/20 text-[#20c997]">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight">
              {config?.title || "Parque Ativo"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {config?.subtitle || "Ocupação do Parque"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${
              isOptimal
                ? "bg-[#20c997]/10 text-[#20c997] border-[#20c997]/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            <Activity className="w-3 h-3 animate-pulse" />
            {occupancy}% Ocupado
          </span>

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
            {printing}
          </span>
          <span className="text-lg font-mono text-slate-500">
            / {total} <span className="text-xs font-sans font-normal text-slate-400">em operação</span>
          </span>
        </div>

        {/* Subtle capacity bar */}
        {config?.settings?.showCapacityBar !== false && (
          <div className="mt-3">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono mb-1">
              <span>Capacidade Atual</span>
              <span>Meta: {targetOccupancy}%</span>
            </div>
            <div className="relative w-full h-2 bg-[#0a0f1b] rounded-full overflow-hidden border border-[#263246]">
              {/* Target Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
                style={{ left: `${Math.min(targetOccupancy, 100)}%` }}
                title={`Meta: ${targetOccupancy}%`}
              />
              {/* Progress */}
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOptimal
                    ? "bg-gradient-to-r from-[#20c997]/80 to-[#20c997]"
                    : "bg-gradient-to-r from-amber-500/80 to-amber-400"
                }`}
                style={{ width: `${Math.min(occupancy, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Breakdown */}
      <div className="pt-2 border-t border-[#263246]/60 flex items-center justify-between text-[11px] text-slate-400 font-mono relative z-10">
        <div className="flex items-center gap-1 text-[#20c997]">
          <CheckCircle2 className="w-3 h-3" />
          <span>{ready} Prontas</span>
        </div>
        <div className="flex items-center gap-1 text-amber-400">
          <AlertTriangle className="w-3 h-3" />
          <span>{maintenance} Pausa/Manut.</span>
        </div>
      </div>
    </div>
  );
}
