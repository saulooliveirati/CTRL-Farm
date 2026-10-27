"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  BarChart3,
  Calendar,
  Sparkles,
  Settings2,
  ChevronDown,
} from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { ProductionRecord } from "@/lib/server-production";

interface FilamentTelemetryChartProps {
  jobs?: ProductionRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

// 7-day default telemetry data
const DEFAULT_WEEKLY_DATA = [
  { day: "Seg", date: "21 Out", kg: 3.2, grams: 3200, pla: 60, petg: 30, abs: 10 },
  { day: "Ter", date: "22 Out", kg: 4.5, grams: 4500, pla: 50, petg: 40, abs: 10 },
  { day: "Qua", date: "23 Out", kg: 3.8, grams: 3800, pla: 70, petg: 20, abs: 10 },
  { day: "Qui", date: "24 Out", kg: 5.1, grams: 5100, pla: 45, petg: 45, abs: 10 },
  { day: "Sex", date: "25 Out", kg: 6.4, grams: 6400, pla: 55, petg: 35, abs: 10 },
  { day: "Sáb", date: "26 Out", kg: 4.2, grams: 4200, pla: 65, petg: 25, abs: 10 },
  { day: "Dom", date: "27 Out", kg: 2.8, grams: 2800, pla: 80, petg: 20, abs: 0 },
];

export function FilamentTelemetryChartCard({
  jobs = [],
  config,
  onOpenSettings,
  isEditing,
}: FilamentTelemetryChartProps) {
  const [unit, setUnit] = useState<"kg" | "g">(config?.settings?.unit ?? "kg");
  const [period, setPeriod] = useState<number>(config?.settings?.chartPeriodDays ?? 7);
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Compute stats
  const totalKg = useMemo(() => {
    return DEFAULT_WEEKLY_DATA.reduce((acc, d) => acc + d.kg, 0).toFixed(1);
  }, []);

  const avgKg = useMemo(() => {
    return (Number(totalKg) / DEFAULT_WEEKLY_DATA.length).toFixed(2);
  }, [totalKg]);

  const peakDay = useMemo(() => {
    return [...DEFAULT_WEEKLY_DATA].sort((a, b) => b.kg - a.kg)[0];
  }, []);

  // SVG Chart Geometry
  const chartWidth = 720;
  const chartHeight = 160;
  const paddingX = 40;
  const paddingY = 24;

  const maxVal = Math.max(...DEFAULT_WEEKLY_DATA.map((d) => d.kg)) * 1.15;
  const minVal = 0;

  // Calculate coordinates
  const points = useMemo(() => {
    const usableW = chartWidth - paddingX * 2;
    const usableH = chartHeight - paddingY * 2;

    return DEFAULT_WEEKLY_DATA.map((d, i) => {
      const x = paddingX + (i / (DEFAULT_WEEKLY_DATA.length - 1)) * usableW;
      const y = chartHeight - paddingY - ((d.kg - minVal) / (maxVal - minVal)) * usableH;
      return { x, y, data: d };
    });
  }, [maxVal, minVal, chartWidth, chartHeight, paddingX, paddingY]);

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
      {/* Background neon ambient highlight */}
      <div className="absolute top-1/2 left-1/3 w-80 h-40 bg-[#20c997]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#263246]/60 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#20c997]/10 border border-[#20c997]/20 text-[#20c997]">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100 tracking-tight">
                {config?.title || "Consumo Semanal de Filamento"}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-[#20c997] border border-[#20c997]/30">
                +8.4% vs semana ant.
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {config?.subtitle || "Telemetria de Massa Utilizada por Dia (PLA, PETG, ABS)"}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Unit Switch */}
          <div className="flex items-center bg-[#0a0f1b] p-0.5 rounded-lg border border-[#263246] text-xs font-mono">
            <button
              onClick={() => setUnit("kg")}
              className={`px-2.5 py-1 rounded transition-colors ${
                unit === "kg"
                  ? "bg-[#20c997] text-[#06251e] font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              kg
            </button>
            <button
              onClick={() => setUnit("g")}
              className={`px-2.5 py-1 rounded transition-colors ${
                unit === "g"
                  ? "bg-[#20c997] text-[#06251e] font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              g
            </button>
          </div>

          {/* Period Selector */}
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            className="bg-[#0a0f1b] border border-[#263246] text-slate-300 text-xs rounded-lg px-2.5 py-1 outline-none font-mono"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={14}>Últimos 14 dias</option>
            <option value={30}>Este mês (30 dias)</option>
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

      {/* SVG Smooth Area Chart */}
      <div className="relative my-2 w-full flex-1 min-h-[140px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            {/* Emerald neon gradient */}
            <linearGradient id="filamentAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#20c997" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#20c997" stopOpacity="0.0" />
            </linearGradient>

            {/* Glowing filter */}
            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#20c997" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Horizontal Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
            return (
              <line
                key={idx}
                x1={paddingX}
                y1={y}
                x2={chartWidth - paddingX}
                y2={y}
                stroke="#263246"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.6"
              />
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#filamentAreaGrad)" />

          {/* Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke="#20c997"
            strokeWidth="3"
            filter="url(#neonGlow)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points and Interactivity */}
          {points.map((pt, index) => {
            const isHovered = hoveredPoint === index;
            const displayVal =
              unit === "kg" ? `${pt.data.kg} kg` : `${pt.data.grams} g`;

            return (
              <g key={index}>
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingY}
                    x2={pt.x}
                    y2={chartHeight - paddingY}
                    stroke="#20c997"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                )}

                {/* Point outer halo */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#0a0f1b"
                  stroke="#20c997"
                  strokeWidth="2.5"
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />

                {/* X Axis Label */}
                <text
                  x={pt.x}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className={`text-[11px] font-mono select-none transition-colors ${
                    isHovered ? "fill-[#20c997] font-bold" : "fill-slate-400"
                  }`}
                >
                  {pt.data.day}
                </text>

                {/* Hover Tooltip rendered in SVG */}
                {isHovered && (
                  <g transform={`translate(${Math.min(Math.max(pt.x, 70), chartWidth - 70)}, ${Math.max(pt.y - 35, 20)})`}>
                    <rect
                      x="-60"
                      y="-18"
                      width="120"
                      height="26"
                      rx="6"
                      fill="#101827"
                      stroke="#20c997"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="-1"
                      textAnchor="middle"
                      fill="#e2e8f0"
                      className="text-[11px] font-mono font-bold"
                    >
                      {pt.data.date}: {displayVal}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer Summary Stats */}
      <div className="pt-3 border-t border-[#263246]/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono relative z-10">
        <div className="p-2 rounded-lg bg-[#0a0f1b]/60 border border-[#263246]/60">
          <span className="text-[10px] text-slate-400 block">Total Semanal</span>
          <span className="text-sm font-bold text-slate-100">
            {unit === "kg" ? `${totalKg} kg` : `${Number(totalKg) * 1000} g`}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#0a0f1b]/60 border border-[#263246]/60">
          <span className="text-[10px] text-slate-400 block">Média Diária</span>
          <span className="text-sm font-bold text-[#20c997]">
            {unit === "kg" ? `${avgKg} kg` : `${Number(avgKg) * 1000} g`}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#0a0f1b]/60 border border-[#263246]/60">
          <span className="text-[10px] text-slate-400 block">Pico de Demanda</span>
          <span className="text-sm font-bold text-amber-400">
            {peakDay.day} ({peakDay.kg} kg)
          </span>
        </div>

        <div className="p-2 rounded-lg bg-[#0a0f1b]/60 border border-[#263246]/60">
          <span className="text-[10px] text-slate-400 block">Composição</span>
          <span className="text-sm font-bold text-slate-300">
            60% PLA • 30% PETG
          </span>
        </div>
      </div>
    </div>
  );
}
