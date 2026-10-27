"use client";

import Link from "next/link";
import { Disc3, AlertTriangle, CheckCircle, Package, Settings2 } from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { FilamentRecord } from "@/lib/server-filaments";

interface KpiFilamentStockProps {
  filaments: FilamentRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

export function KpiFilamentStockCard({
  filaments = [],
  config,
  onOpenSettings,
  isEditing,
}: KpiFilamentStockProps) {
  const totalWeightG = filaments.reduce((acc, f) => acc + (f.currentWeightG ?? 0), 0);
  const totalWeightKg = (totalWeightG / 1000).toFixed(1);

  // Bobinas com estoque baixo
  const alertThresholdKg = config?.settings?.alertThresholdKg ?? 5.0;
  // Bobina individual com menos de 250g é considerada crítica
  const lowSpools = filaments.filter((f) => (f.currentWeightG ?? 0) <= 250);
  const hasLowSpools = lowSpools.length > 0;
  const isOverallLow = totalWeightG / 1000 < alertThresholdKg;

  return (
    <div className="relative flex flex-col justify-between h-full w-full p-5 bg-[#101827] border border-[#263246] hover:border-amber-500/40 hover:bg-[#151f30] rounded-xl transition-all duration-200 group shadow-lg shadow-black/20 overflow-hidden">
      {/* Background ambient glow */}
      <div className={`absolute top-0 right-0 w-32 h-32 ${hasLowSpools ? 'bg-amber-500/5' : 'bg-[#20c997]/5'} rounded-full blur-2xl pointer-events-none -mr-10 -mt-10`} />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <Link href="/filaments" className="flex items-center gap-2.5 group-hover:opacity-90 transition">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Disc3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight group-hover:text-amber-400 transition">
              {config?.title || "Estoque de Insumos"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {config?.subtitle || "Saldo de Filamentos"}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          {config?.settings?.showWarningBadge !== false && hasLowSpools ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border bg-amber-500/10 text-amber-400 border-amber-500/30">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              {lowSpools.length} {lowSpools.length === 1 ? "bobina baixa" : "bobinas baixas"}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Nível OK
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
      <Link href="/filaments" className="my-auto py-2 relative z-10 block">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
            {totalWeightKg}
          </span>
          <span className="text-lg font-mono text-slate-500">
            kg <span className="text-xs font-sans font-normal text-slate-400">disponíveis</span>
          </span>
        </div>

        {/* Breakdown bar */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-slate-400" />
            <span>{filaments.length} carretéis no almoxarifado</span>
          </div>
          {isOverallLow && (
            <span className="text-amber-400 font-mono text-[10px]">
              Abaixo de {alertThresholdKg}kg
            </span>
          )}
        </div>
      </Link>

      {/* Footer Info */}
      <div className="pt-2 border-t border-[#263246]/60 flex items-center justify-between text-[11px] text-slate-400 font-mono relative z-10">
        <span>Carretéis: <strong className="text-slate-200">{filaments.length}</strong></span>
        <Link href="/filaments" className="text-amber-400 hover:underline">
          Almoxarifado →
        </Link>
      </div>
    </div>
  );
}
