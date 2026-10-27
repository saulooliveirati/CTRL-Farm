"use client";

import type { FilamentRecord } from "@/lib/server-filaments";
import { findMaterialDatabaseItem, type MaterialItem } from "@/lib/material-database";
import { SpoolGraphic } from "./spool-graphic";
import { parseColor } from "./color-picker-modal";

interface MaterialDetailModalProps {
  filament: FilamentRecord;
  onClose: () => void;
  onEdit?: () => void;
}

export function MaterialDetailModal({ filament, onClose, onEdit }: MaterialDetailModalProps) {
  const item: MaterialItem | undefined = findMaterialDatabaseItem(
    filament.brand,
    filament.material,
  );
  const parsed = parseColor(filament.color);
  const ratio = filament.initialWeightG > 0 ? filament.currentWeightG / filament.initialWeightG : 0;
  const percent = Math.round(ratio * 100);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 p-3 backdrop-blur-sm animate-in fade-in"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="material-detail-title"
        className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl sm:p-6"
      >
        {/* ================= HEADER DO MATERIAL ================= */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3.5">
            <SpoolGraphic colorHex={parsed.hex} ratio={ratio} size={56} />
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  {filament.brand}
                </span>
                <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                  {item ? item.technology : "FDM"}
                </span>
                <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                  {filament.material}
                </span>
              </div>
              <h2 id="material-detail-title" className="text-lg font-bold text-white mt-1">
                {filament.brand} · {parsed.name}
              </h2>
              <p className="text-xs text-slate-400">
                {item ? item.name : "Ficha Técnica e Propriedades do Material"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* ================= STATUS DE ESTOQUE ATUAL ================= */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-800 bg-[#070c16] p-3">
            <span className="text-[10px] text-slate-400">Disponível no Carretel</span>
            <p className="mt-1 font-bold text-white text-sm">
              {filament.currentWeightG} g{" "}
              <span className="text-[10px] text-slate-400 font-normal">({percent}%)</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#070c16] p-3">
            <span className="text-[10px] text-slate-400">Peso Total Inicial</span>
            <p className="mt-1 font-bold text-slate-200 text-sm">{filament.initialWeightG} g</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#070c16] p-3">
            <span className="text-[10px] text-slate-400">Custo Total / Valor</span>
            <p className="mt-1 font-bold text-emerald-400 text-sm">
              {filament.price
                ? Number(filament.price).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "Sem custo"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#070c16] p-3">
            <span className="text-[10px] text-slate-400">Lote de Fabricação</span>
            <p className="mt-1 font-mono font-bold text-amber-300 text-xs truncate">
              {filament.lot || "Não informado"}
            </p>
          </div>
        </div>

        {/* ================= DADOS TÉCNICOS DA BASE DE CONHECIMENTO ================= */}
        {item ? (
          <div className="mt-5 space-y-4">
            {/* Bloco 1: Propriedades Físicas e Mecânicas */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-white uppercase tracking-wider">
                <span>🔬</span>
                <span>Propriedades Físicas &amp; Mecânicas</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-slate-400 block text-[11px]">Densidade:</span>
                  <strong className="text-white font-mono">
                    {item.properties.densityGcm3} g/cm³
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Resistência à Tração:</span>
                  <strong className="text-emerald-400">{item.properties.tensileStrengthMpa}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Módulo de Flexão:</span>
                  <strong className="text-white">{item.properties.flexuralModulusMpa}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Resistência ao Impacto:</span>
                  <strong className="text-white">{item.properties.impactStrengthKjm2}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Deflexão Térmica (HDT):</span>
                  <strong className="text-amber-300">{item.properties.heatDeflectionTempC}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Alongamento na Ruptura:</span>
                  <strong className="text-white">{item.properties.elongationAtBreak}</strong>
                </div>
              </div>
            </div>

            {/* Bloco 2: Perfis de Fatiamento & Impressão Recomendados */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4 space-y-2.5">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-white uppercase tracking-wider">
                <span>⚙️</span>
                <span>Parâmetros de Fatiamento Recomendados</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-slate-400 block text-[11px]">Temperatura do Bico:</span>
                  <strong className="text-rose-400 font-mono">
                    {item.printProfile.nozzleTempRangeC} (Ideal:{" "}
                    {item.printProfile.recommendedNozzleTempC}°C)
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Temperatura da Mesa:</span>
                  <strong className="text-amber-400 font-mono">
                    {item.printProfile.bedTempRangeC} (Ideal:{" "}
                    {item.printProfile.recommendedBedTempC}°C)
                  </strong>
                </div>
                {item.printProfile.exposureTimeSec && (
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      Tempo de Exposição (SLA):
                    </span>
                    <strong className="text-purple-400 font-mono">
                      {item.printProfile.exposureTimeSec}
                    </strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Ventoinha de Resfriamento:
                  </span>
                  <strong className="text-white">{item.printProfile.coolingFanPercent}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">
                    Câmara Aquecida / Fechada:
                  </span>
                  <strong className="text-white">{item.printProfile.enclosureRequired}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Secagem do Material:</span>
                  <strong className="text-sky-300">{item.printProfile.dryingRecommendation}</strong>
                </div>
              </div>

              {/* Fatiadores Recomendados */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center gap-2 text-xs">
                <span className="text-slate-400">Fatiadores Recomendados:</span>
                <div className="flex flex-wrap gap-1">
                  {item.printProfile.recommendedSlicers.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bloco 3: Certificações e Documentação Técnica */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-white uppercase tracking-wider">
                  <span>📑</span>
                  <span>Certificações &amp; Documentos (TDS / SDS)</span>
                </div>
                <div className="flex items-center gap-2">
                  {item.certifications.rohs && (
                    <span className="rounded bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold border border-emerald-500/30">
                      RoHS
                    </span>
                  )}
                  {item.certifications.reach && (
                    <span className="rounded bg-blue-500/20 text-blue-400 px-1.5 py-0.5 text-[10px] font-bold border border-blue-500/30">
                      REACH
                    </span>
                  )}
                  {item.certifications.fdaFoodContact && (
                    <span className="rounded bg-purple-500/20 text-purple-400 px-1.5 py-0.5 text-[10px] font-bold border border-purple-500/30">
                      FDA Food Contact
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-slate-400 text-[11px]">
                  Fichas técnicas oficiais e relatórios de segurança química do material:
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={item.certifications.tdsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20 transition"
                  >
                    <span>📄</span>
                    <span>TDS (Ficha Técnica)</span>
                  </a>
                  <a
                    href={item.certifications.sdsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    <span>🛡️</span>
                    <span>SDS / FISPQ</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-[#070c16] p-4 text-xs text-slate-400">
            <p>
              💡 Material não vinculado diretamente à base de conhecimento pré-cadastrada. Você pode
              vincular a uma marca e material conhecidos na edição deste carretel.
            </p>
          </div>
        )}

        {/* ================= RODAPÉ COM AÇÕES ================= */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
          <span className="text-[11px] text-slate-500">
            Fornecedor:{" "}
            <strong className="text-slate-300">{filament.supplier?.name || "Não vinculado"}</strong>
          </span>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
              >
                <span>✏️</span>
                <span>Editar Bobina</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
