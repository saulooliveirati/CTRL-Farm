// ==============================================================================
// Componente de Gráfico Interativo iOS (SVG Dinâmico, Área com Gradiente e Tooltips)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { CashflowPoint } from '@/hooks/mobile/use-mobile-finance';
import { useHaptics } from '@/hooks/mobile/use-haptics';

interface IOSChartProps {
  data: CashflowPoint[];
  height?: number;
  className?: string;
}

export function IOSChart({ data, height = 180, className = '' }: IOSChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { triggerHaptic } = useHaptics();

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.receita), 100);
  const minVal = 0;
  const paddingX = 24;
  const paddingY = 20;
  const chartWidth = 340;
  const chartHeight = height - paddingY * 2;

  // Calcula coordenadas para o traçado SVG
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (chartWidth - paddingX * 2);
    const y = height - paddingY - ((d.receita - minVal) / (maxVal - minVal)) * chartHeight;
    return { x, y, ...d };
  });

  // Linha suavizada (curva Bezier simples)
  const pathD = points.reduce((acc, curr, i, arr) => {
    if (i === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[i - 1];
    const cpX = (prev.x + curr.x) / 2;
    return `${acc} C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
  }, '');

  // Área preenchida com gradiente
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const handleTouchPoint = (index: number) => {
    if (activeIndex !== index) {
      triggerHaptic('light');
      setActiveIndex(index);
    }
  };

  const activeItem = activeIndex !== null ? data[activeIndex] : data[data.length - 1];

  return (
    <div className={`w-full flex flex-col select-none ${className}`}>
      {/* Tooltip Header Dinâmico */}
      <div className="flex items-center justify-between px-2 mb-2">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            {activeItem.label} ({activeItem.date})
          </span>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
            R$ {activeItem.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
            Lucro: R$ {activeItem.lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
          <div className="text-[10px] text-slate-400 dark:text-slate-500">
            Custo: R$ {activeItem.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-50 dark:bg-black/30 p-1 border border-slate-200/50 dark:border-white/5">
        <svg
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="w-full h-auto overflow-visible touch-none"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#20c997" stop-opacity="0.4" />
              <stop offset="60%" stop-color="#20c997" stop-opacity="0.08" />
              <stop offset="100%" stop-color="#20c997" stop-opacity="0" />
            </linearGradient>
          </defs>

          {/* Linhas de Grade Horizontais */}
          <line
            x1={paddingX}
            y1={paddingY}
            x2={chartWidth - paddingX}
            y2={paddingY}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height / 2}
            x2={chartWidth - paddingX}
            y2={height / 2}
            stroke="currentColor"
            className="text-slate-200 dark:text-slate-800"
            strokeDasharray="4 4"
          />
          <line
            x1={paddingX}
            y1={height - paddingY}
            x2={chartWidth - paddingX}
            y2={height - paddingY}
            stroke="currentColor"
            className="text-slate-300 dark:text-slate-700"
          />

          {/* Área com Gradiente */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Linha Principal da Curva */}
          <path
            d={pathD}
            fill="none"
            stroke="#20c997"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Pontos Clicáveis / Interativos */}
          {points.map((pt, idx) => {
            const isActive = activeIndex === idx || (activeIndex === null && idx === points.length - 1);
            return (
              <g
                key={idx}
                className="cursor-pointer"
                onClick={() => handleTouchPoint(idx)}
                onTouchStart={() => handleTouchPoint(idx)}
              >
                {isActive && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    fill="#20c997"
                    opacity="0.3"
                    className="animate-pulse"
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isActive ? '5' : '3.5'}
                  fill={isActive ? '#ffffff' : '#20c997'}
                  stroke="#20c997"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
