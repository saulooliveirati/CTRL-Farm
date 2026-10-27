"use client";

import { type ReactNode, useState } from "react";
import { findMaterialDatabaseItem, type MaterialItem } from "@/lib/material-database";

interface MaterialHoverCardProps {
  brand?: string | null;
  material?: string | null;
  children: ReactNode;
  onOpenDetails?: () => void;
}

export function MaterialHoverCard({
  brand,
  material,
  children,
  onOpenDetails,
}: MaterialHoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const item: MaterialItem | undefined = findMaterialDatabaseItem(brand, material);

  if (!item) {
    return <>{children}</>;
  }

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 sm:w-80 pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95">
          <div className="rounded-2xl border border-slate-700/90 bg-[#0d1322]/95 p-3.5 shadow-2xl backdrop-blur-md text-slate-100 text-xs">
            {/* Header do Balão */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🔬</span>
                <div>
                  <h4 className="font-bold text-white leading-tight">{item.name}</h4>
                  <p className="text-[10px] text-slate-400">
                    {item.manufacturerBrand} · {item.technology}
                  </p>
                </div>
              </div>
              <span className="rounded bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 text-[9px] font-bold border border-emerald-500/30">
                {item.category}
              </span>
            </div>

            {/* Grid de Propriedades Rápidas */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-[#070c16] p-2 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">🌡️ Temp. Bico</span>
                <strong className="text-rose-400 font-mono">
                  {item.printProfile.recommendedNozzleTempC > 0
                    ? `${item.printProfile.recommendedNozzleTempC}°C`
                    : "N/A (SLA)"}
                </strong>
                <span className="text-[9px] text-slate-500 block">
                  {item.printProfile.nozzleTempRangeC}
                </span>
              </div>

              <div className="rounded-lg bg-[#070c16] p-2 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">♨️ Temp. Mesa</span>
                <strong className="text-amber-400 font-mono">
                  {item.printProfile.recommendedBedTempC > 0
                    ? `${item.printProfile.recommendedBedTempC}°C`
                    : "N/A"}
                </strong>
                <span className="text-[9px] text-slate-500 block">
                  {item.printProfile.bedTempRangeC}
                </span>
              </div>

              <div className="rounded-lg bg-[#070c16] p-2 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">⚡ Tração (MPa)</span>
                <strong className="text-emerald-400 font-mono">
                  {item.properties.tensileStrengthMpa}
                </strong>
              </div>

              <div className="rounded-lg bg-[#070c16] p-2 border border-slate-800/80">
                <span className="text-[10px] text-slate-400 block">⚖️ Densidade</span>
                <strong className="text-white font-mono">
                  {item.properties.densityGcm3} g/cm³
                </strong>
              </div>
            </div>

            {/* Certificações & Fatiador */}
            <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
              <span>Rec.: {item.printProfile.recommendedSlicers[0]}</span>
              <span className="text-emerald-400 font-semibold">TDS &amp; SDS Disponíveis</span>
            </div>

            {/* Dica de clique se houver handler */}
            {onOpenDetails && (
              <p className="mt-1 text-center text-[9px] text-slate-500">
                💡 Clique no botão de Ficha Técnica para relatório completo
              </p>
            )}

            {/* Seta do balão */}
            <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 h-0 w-0 border-x-6 border-x-transparent border-t-6 border-t-[#0d1322]" />
          </div>
        </div>
      )}
    </div>
  );
}
