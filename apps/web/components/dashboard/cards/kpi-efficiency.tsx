"use client";

import Link from "next/link";
import { Zap, TrendingUp, Settings2, CheckCircle2 } from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { ProductionRecord } from "@/lib/server-production";

interface KpiEfficiencyProps {
  jobs: ProductionRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

export function KpiEfficiencyCard({
  jobs = [],
  config,
  onOpenSettings,
  isEditing,
}: KpiEfficiencyProps) {
  // Calculate completed vs failed jobs
  const completed = jobs.filter((j) => j.status === "COMPLETED").length;
  const failed = jobs.filter((j) => j.status === "FAILED").length;
  const totalFinished = completed + failed;

  // Real or initial efficiency
  const efficiency =
    totalFinished > 0
      ? Math.round((completed / totalFinished) * 100)
      : 100; // 100% de disponibilidade inicial com 0 falhas

  const target = config?.settings?.targetEfficiency ?? 92;
  const isTargetMet = efficiency >= target;

  // Mini sparkline SVG data points (e.g. 7 points)
  const sparklinePoints = totalFinished > 0
    ? [Math.max(70, efficiency - 6), Math.max(70, efficiency - 4), Math.max(70, efficiency - 2), efficiency]
    : [100, 100, 100, 100];
  const minVal = Math.min(...sparklinePoints) - 5;
  const maxVal = Math.max(...sparklinePoints) + 5;
  const width = 120;
  const height = 36;

  const pointsString = sparklinePoints
    .map((val, idx) => {
      const x = (idx / (sparklinePoints.length - 1)) * width;
      const y = height - ((val - minVal) / (maxVal - minVal)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const areaString = `0,${height} ${pointsString} ${width},${height}`;

  return (
    <div className="relative flex flex-col justify-between h-full w-full p-5 bg-[#101827] border border-[#263246] hover:border-[#20c997]/40 hover:bg-[#151f30] rounded-xl transition-all duration-200 group shadow-lg shadow-black/20 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#20c997]/5 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 relative z-10">
        <Link href="/production" className="flex items-center gap-2.5 group-hover:opacity-90 transition">
          <div className="p-2.5 rounded-lg bg-[#20c997]/10 border border-[#20c997]/20 text-[#20c997]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight group-hover:text-[#20c997] transition">
              {config?.title || "Eficiência Operacional"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {config?.subtitle || "Índice OEE Diário"}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border bg-emerald-500/10 text-[#20c997] border-[#20c997]/30">
            <TrendingUp className="w-3 h-3" />
            {totalFinished > 0 ? `${completed}/${totalFinished}` : "0 Falhas"}
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

      {/* Main Metric with SVG Sparkline */}
      <Link href="/production" className="my-auto py-2 flex items-center justify-between gap-4 relative z-10 block">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
              {efficiency}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalFinished === 0
              ? "✓ Alta Disponibilidade (Sem paradas)"
              : isTargetMet
              ? "✓ Alta Performance"
              : "Abaixo da meta estimada"}
          </p>
        </div>

        {/* Mini Sparkline Chart */}
        <div className="w-[120px] h-[36px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="effGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#20c997" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#20c997" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={areaString} fill="url(#effGrad)" />
            <polyline
              points={pointsString}
              fill="none"
              stroke="#20c997"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Link>

      {/* Footer Info */}
      <div className="pt-2 border-t border-[#263246]/60 flex items-center justify-between text-[11px] text-slate-400 font-mono relative z-10">
        <span>Concluídas: <strong className="text-slate-200">{completed}</strong></span>
        <span>Falhas: <strong className={failed > 0 ? "text-rose-400" : "text-slate-200"}>{failed}</strong></span>
      </div>
    </div>
  );
}
