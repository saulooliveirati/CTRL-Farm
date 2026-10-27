"use client";

import { Zap, TrendingUp, Settings2 } from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { ProductionRecord } from "@/lib/server-production";

interface KpiEfficiencyProps {
  jobs: ProductionRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

export function KpiEfficiencyCard({
  jobs,
  config,
  onOpenSettings,
  isEditing,
}: KpiEfficiencyProps) {
  // Calculate completed vs failed jobs
  const completed = jobs.filter((j) => j.status === "COMPLETED").length;
  const failed = jobs.filter((j) => j.status === "FAILED").length;
  const totalFinished = completed + failed;

  // Real or synthetic efficiency
  const efficiency =
    totalFinished > 0
      ? Math.round((completed / totalFinished) * 100)
      : (config?.settings?.targetEfficiency ?? 94);

  const target = config?.settings?.targetEfficiency ?? 92;
  const isTargetMet = efficiency >= target;

  // Mini sparkline SVG data points (e.g. 7 points for days)
  const sparklinePoints = [84, 88, 86, 91, 89, 93, efficiency];
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
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-[#20c997]/10 border border-[#20c997]/20 text-[#20c997]">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200 tracking-tight">
              {config?.title || "Eficiência Operacional"}
            </h3>
            <p className="text-[11px] text-slate-400">
              {config?.subtitle || "Índice OEE Diário"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border bg-emerald-500/10 text-[#20c997] border-[#20c997]/30">
            <TrendingUp className="w-3 h-3" />
            +3.2%
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
      <div className="my-auto py-2 flex items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100 tracking-tight">
              {efficiency}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {isTargetMet ? "✓ Alta Performance" : "Abaixo da meta estimada"}
          </p>
        </div>

        {/* Mini SVG Sparkline */}
        <div className="relative">
          <svg width={width} height={height} className="overflow-visible">
            <defs>
              <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#20c997" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#20c997" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polygon points={areaString} fill="url(#sparklineGrad)" />
            <polyline
              points={pointsString}
              fill="none"
              stroke="#20c997"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Last dot glow */}
            <circle
              cx={width}
              cy={height - ((efficiency - minVal) / (maxVal - minVal)) * height}
              r="3.5"
              fill="#20c997"
              className="animate-pulse"
            />
          </svg>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-[#263246]/60 flex items-center justify-between text-[11px] text-slate-400 font-mono relative z-10">
        <div>
          <span>Meta da Farm: </span>
          <span className="text-slate-200 font-semibold">{target}%</span>
        </div>
        <div className="text-[10px] text-slate-400">
          {completed} concluídas • {failed} falhas
        </div>
      </div>
    </div>
  );
}
