"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  Settings2,
  ChevronDown,
  Disc3,
  ArrowRight,
} from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { ProductionRecord } from "@/lib/server-production";

interface FilamentTelemetryChartProps {
  jobs?: ProductionRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

export function FilamentTelemetryChartCard({
  jobs = [],
  config,
  onOpenSettings,
  isEditing,
}: FilamentTelemetryChartProps) {
  const [unit, setUnit] = useState<"kg" | "g">(config?.settings?.unit ?? "kg");
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Calcula os últimos 7 dias de consumo real baseado nas ordens de produção
  const weeklyData = useMemo(() => {
    const days: {
      day: string;
      date: string;
      fullDate: string;
      kg: number;
      grams: number;
      materials: Record<string, number>;
    }[] = [];

    const weekDaysNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    const today = new Date();
    today.setHours(23, 59, 59, 999);

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayName = weekDaysNames[d.getDay()];
      const dayDisplay = `${d.getDate()} ${monthNames[d.getMonth()]}`;

      // Encontra jobs executados/criados neste dia
      const dayJobs = jobs.filter((j) => {
        const jDate = (j.completedAt || j.startedAt || j.createdAt || "").slice(0, 10);
        return jDate === dateStr;
      });

      let dayGrams = 0;
      const materials: Record<string, number> = {};

      for (const j of dayJobs) {
        const weight = j.actualWeightG ?? j.plannedWeightG ?? 0;
        dayGrams += weight;
        const mat = (j.filament?.material || "PLA").toUpperCase();
        materials[mat] = (materials[mat] || 0) + weight;
      }

      days.push({
        day: dayName,
        date: dayDisplay,
        fullDate: dateStr,
        grams: dayGrams,
        kg: Number((dayGrams / 1000).toFixed(2)),
        materials,
      });
    }

    return days;
  }, [jobs]);

  // Compute stats
  const totalGrams = useMemo(() => {
    return weeklyData.reduce((acc, d) => acc + d.grams, 0);
  }, [weeklyData]);

  const totalKg = (totalGrams / 1000).toFixed(2);
  const avgKg = (Number(totalKg) / weeklyData.length).toFixed(2);
  const peakDay = useMemo(() => {
    return [...weeklyData].sort((a, b) => b.kg - a.kg)[0];
  }, [weeklyData]);

  const hasConsumption = totalGrams > 0;

  // SVG Chart Geometry
  const chartWidth = 720;
  const chartHeight = 160;
  const paddingX = 40;
  const paddingY = 24;

  const rawMax = Math.max(...weeklyData.map((d) => d.kg));
  const maxVal = rawMax > 0 ? rawMax * 1.25 : 1.0;
  const minVal = 0;

  // Calculate coordinates
  const points = useMemo(() => {
    const usableW = chartWidth - paddingX * 2;
    const usableH = chartHeight - paddingY * 2;

    return weeklyData.map((d, i) => {
      const x = paddingX + (i / (weeklyData.length - 1)) * usableW;
      const y = chartHeight - paddingY - ((d.kg - minVal) / (maxVal - minVal)) * usableH;
      return { x, y, data: d };
    });
  }, [maxVal, minVal, chartWidth, chartHeight, paddingX, paddingY, weeklyData]);

  // Construct smooth cubic Bézier curve SVG path
  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 2;
      const cpY1 = curr.y;
      const cpX2 = curr.x + (next.x - curr.x) / 2;
      const cpY2 = next.y;
      d += ` C ${cpX1},${cpY1} ${cpX2},${cpY2} ${next.x},${next.y}`;
    }
    return d;
  }, [points]);

  // Construct area path closing at bottom
  const areaD = useMemo(() => {
    if (!pathD || points.length === 0) return "";
    const last = points[points.length - 1];
    const first = points[0];
    return `${pathD} L ${last.x},${chartHeight - paddingY} L ${first.x},${chartHeight - paddingY} Z`;
  }, [pathD, points, chartHeight, paddingY]);

  return (
    <div className="relative flex flex-col justify-between h-full w-full p-5 bg-[#101827] border border-[#263246] hover:border-[#20c997]/40 rounded-xl transition-all duration-200 group shadow-lg shadow-black/20 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/3 w-96 h-32 bg-[#20c997]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#263246]/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#20c997]/10 border border-[#20c997]/20 text-[#20c997]">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-slate-100 tracking-tight">
                {config?.title || "Consumo Semanal de Filamento"}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#20c997]/10 text-[#20c997] border border-[#20c997]/30">
                Últimos 7 dias
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {config?.subtitle || "Telemetria de insumo consumido por dia"}
            </p>
          </div>
        </div>

        {/* Unit & Settings */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0a0f1b] p-1 rounded-lg border border-[#263246] text-xs">
            <button
              onClick={() => setUnit("kg")}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-all ${
                unit === "kg"
                  ? "bg-[#20c997] text-[#06251e] font-semibold shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              kg
            </button>
            <button
              onClick={() => setUnit("g")}
              className={`px-2 py-0.5 rounded font-mono font-medium transition-all ${
                unit === "g"
                  ? "bg-[#20c997] text-[#06251e] font-semibold shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              g
            </button>
          </div>

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

      {/* KPI Highlights Bar */}
      <div className="grid grid-cols-3 gap-3 my-3">
        <div className="p-2.5 rounded-lg bg-[#0a0f1b]/70 border border-[#263246]/60">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Total 7 Dias
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-100 mt-0.5">
            {unit === "kg" ? `${totalKg} kg` : `${totalGrams} g`}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#0a0f1b]/70 border border-[#263246]/60">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Média Diária
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-slate-100 mt-0.5">
            {unit === "kg" ? `${avgKg} kg` : `${Math.round(totalGrams / 7)} g`}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#0a0f1b]/70 border border-[#263246]/60">
          <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
            Pico no Período
          </span>
          <div className="text-base sm:text-lg font-bold font-mono text-[#20c997] mt-0.5 truncate">
            {hasConsumption ? `${peakDay.day} (${peakDay.kg} kg)` : "—"}
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full aspect-[24/7] min-h-[140px] my-1 select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Emerald Gradient for Area */}
            <linearGradient id="filamentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#20c997" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#20c997" stopOpacity="0.0" />
            </linearGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={chartWidth - paddingX}
            y2={paddingY}
            stroke="#263246"
            strokeDasharray="4 4"
            strokeOpacity="0.5"
          />
          <line
            x1={paddingX}
            y1={(chartHeight - paddingY + paddingY) / 2}
            x2={chartWidth - paddingX}
            y2={(chartHeight - paddingY + paddingY) / 2}
            stroke="#263246"
            strokeDasharray="4 4"
            strokeOpacity="0.5"
          />
          <line
            x1={paddingX}
            y1={chartHeight - paddingY}
            x2={chartWidth - paddingX}
            y2={chartHeight - paddingY}
            stroke="#263246"
            strokeOpacity="0.8"
          />

          {/* Area Fill */}
          {hasConsumption && areaD && (
            <path d={areaD} fill="url(#filamentGradient)" />
          )}

          {/* Main Stroke Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#20c997"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#neonGlow)"
            />
          )}

          {/* Data Points */}
          {points.map((pt, idx) => {
            const isHovered = hoveredPoint === idx;
            return (
              <g key={idx} className="cursor-pointer">
                {/* Invisible hover target */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="14"
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
                {/* Visible node */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? "6" : "3.5"}
                  fill="#0a0f1b"
                  stroke="#20c997"
                  strokeWidth={isHovered ? "2.5" : "1.8"}
                  className="transition-all duration-150 pointer-events-none"
                />

                {/* X-axis day label */}
                <text
                  x={pt.x}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  fill={isHovered ? "#20c997" : "#94a3b8"}
                  fontSize="10"
                  fontFamily="monospace"
                  className="transition-colors pointer-events-none"
                >
                  {pt.data.day}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint !== null && points[hoveredPoint] && (
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full px-3 py-1.5 rounded-lg bg-[#151f30] border border-[#20c997] shadow-xl text-xs font-mono text-slate-100 flex flex-col items-center gap-0.5 animate-in fade-in zoom-in-95 duration-100"
            style={{
              left: `${(points[hoveredPoint].x / chartWidth) * 100}%`,
              top: `${(points[hoveredPoint].y / chartHeight) * 100 - 10}%`,
            }}
          >
            <span className="text-[10px] text-slate-400">
              {points[hoveredPoint].data.date}
            </span>
            <span className="font-bold text-[#20c997]">
              {unit === "kg"
                ? `${points[hoveredPoint].data.kg} kg`
                : `${points[hoveredPoint].data.grams} g`}
            </span>
          </div>
        )}
      </div>

      {/* Footer link to Filaments */}
      <div className="pt-2 border-t border-[#263246]/60 flex items-center justify-between text-xs text-slate-400">
        <span className="text-[11px]">
          {hasConsumption
            ? "✓ Telemetria sincronizada com as ordens de impressão."
            : "Nenhum consumo registrado na última semana."}
        </span>
        <Link
          href="/filaments"
          className="text-[#20c997] hover:underline flex items-center gap-1 font-medium"
        >
          <span>Estoque de Filamentos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
