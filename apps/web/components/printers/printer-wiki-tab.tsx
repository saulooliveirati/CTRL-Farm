"use client";

import { useState, useMemo } from "react";
import {
  PRINTER_WIKI_DATABASE,
  getAllWikiBrands,
  getWikiModelsByBrand,
  findWikiModel,
  type PrinterWikiModel,
} from "@/lib/equipment-wiki-database";

interface PrinterWikiTabProps {
  currentBrand?: string | null;
  currentModel?: string | null;
  onSelectModel?: (model: PrinterWikiModel) => void;
  showSelector?: boolean;
}

export function PrinterWikiTab({
  currentBrand,
  currentModel,
  onSelectModel,
  showSelector = true,
}: PrinterWikiTabProps) {
  const brands = useMemo(() => getAllWikiBrands(), []);

  // Modelo inicial baseado nas props ou default Bambu X1C
  const initialModel = useMemo(() => {
    const found = findWikiModel(currentBrand, currentModel);
    return found ?? PRINTER_WIKI_DATABASE[0]!;
  }, [currentBrand, currentModel]);

  const [selectedBrand, setSelectedBrand] = useState<string>(
    initialModel.brand || brands[0] || "Bambu Lab",
  );
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModel.id);
  const [searchQuery, setSearchQuery] = useState("");

  // Modelos disponíveis para a marca selecionada
  const availableModels = useMemo(() => {
    return getWikiModelsByBrand(selectedBrand);
  }, [selectedBrand]);

  // Modelo ativo para exibição
  const activeModel = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = PRINTER_WIKI_DATABASE.find(
        (m) =>
          m.brand.toLowerCase().includes(q) ||
          m.model.toLowerCase().includes(q) ||
          m.technology.toLowerCase().includes(q),
      );
      if (match) return match;
    }
    const found = PRINTER_WIKI_DATABASE.find((m) => m.id === selectedModelId);
    return found ?? initialModel;
  }, [selectedModelId, searchQuery, initialModel]);

  function handleBrandChange(brand: string) {
    setSelectedBrand(brand);
    const models = getWikiModelsByBrand(brand);
    if (models.length > 0) {
      setSelectedModelId(models[0]!.id);
      if (onSelectModel) onSelectModel(models[0]!);
    }
  }

  function handleModelChange(modelId: string) {
    setSelectedModelId(modelId);
    const model = PRINTER_WIKI_DATABASE.find((m) => m.id === modelId);
    if (model && onSelectModel) onSelectModel(model);
  }

  return (
    <div className="space-y-6">
      {/* ================= BARRA DE SELEÇÃO & NAVEGAÇÃO ================= */}
      {showSelector && (
        <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">📚</span>
              <div>
                <h3 className="text-sm font-bold text-white">Wiki Técnica de Equipamentos 3D</h3>
                <p className="text-[11px] text-slate-400">
                  Consulte especificações completas, consumo elétrico, fluxo e custos por modelo
                </p>
              </div>
            </div>

            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Buscar modelo na Wiki…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Fabricante / Marca:
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => handleBrandChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0e1424] px-3 py-2 text-xs font-semibold text-white outline-none focus:border-emerald-500"
              >
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Modelo Catalogado:
              </label>
              <select
                value={activeModel.id}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0e1424] px-3 py-2 text-xs font-semibold text-emerald-400 outline-none focus:border-emerald-500"
              >
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.model} ({m.technology} · {m.releaseYear})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ================= CARTÃO PRINCIPAL: CABEÇALHO DO MODELO ================= */}
      <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-[#0b1220] via-[#0d1627] to-[#070c16] p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                {activeModel.brand}
              </span>
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/30">
                {activeModel.technology}
              </span>
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-[10px] font-mono text-slate-300 border border-slate-700">
                Lançamento: {activeModel.releaseYear}
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white sm:text-2xl tracking-tight">
              {activeModel.brand} {activeModel.model}
            </h2>
            {activeModel.notes && (
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                {activeModel.notes}
              </p>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-right">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Preço Médio de Aquisição
            </span>
            <span className="text-lg font-black text-emerald-400">
              {activeModel.estimatedPriceBrl > 0
                ? activeModel.estimatedPriceBrl.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })
                : "Sob Consulta"}
            </span>
            <span className="text-[10px] text-slate-400">{activeModel.warranty}</span>
          </div>
        </div>

        {/* ================= DESTAQUES RÁPIDOS DA MÁQUINA ================= */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-800/80 bg-[#080d17] p-3">
            <span className="text-[10px] text-slate-400">📦 Volume de Impressão</span>
            <p className="mt-1 font-bold text-white text-sm">{activeModel.buildVolume}</p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#080d17] p-3">
            <span className="text-[10px] text-slate-400">⚡ Consumo Médio</span>
            <p className="mt-1 font-bold text-amber-300 text-sm">
              {activeModel.avgPowerW} W{" "}
              <span className="text-[10px] font-normal text-slate-400">
                ({activeModel.avgConsumptionKwh} kWh)
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#080d17] p-3">
            <span className="text-[10px] text-slate-400">🚀 Velocidade Máxima</span>
            <p className="mt-1 font-bold text-sky-400 text-sm">
              {activeModel.maxSpeedMmS} mm/s{" "}
              <span className="text-[10px] font-normal text-slate-400">
                (Rec.: {activeModel.recommendedSpeedMmS} mm/s)
              </span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/80 bg-[#080d17] p-3">
            <span className="text-[10px] text-slate-400">🌡️ Temperatura Máx. Bico</span>
            <p className="mt-1 font-bold text-rose-400 text-sm">
              {activeModel.maxNozzleTempC > 0 ? `${activeModel.maxNozzleTempC}°C` : "N/A"}{" "}
              <span className="text-[10px] font-normal text-slate-400">
                {activeModel.maxBedTempC > 0 ? `(Mesa ${activeModel.maxBedTempC}°C)` : ""}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ================= GRADE DE ESPECIFICAÇÕES TÉCNICAS COMPLETAS ================= */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* BLOCO 1: EXTRUSÃO & CINEMÁTICA */}
        <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-white uppercase tracking-wider">
            <span>⚙️</span>
            <span>Extrusão & Cinemática</span>
          </div>

          <dl className="divide-y divide-slate-800/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Tipo de Extrusor</dt>
              <dd className="font-semibold text-white text-right max-w-[65%]">
                {activeModel.extruderType}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Fluxo Volumétrico Máx.</dt>
              <dd className="font-mono font-bold text-emerald-400">
                {activeModel.maxFlowRateMm3s > 0 ? `${activeModel.maxFlowRateMm3s} mm³/s` : "N/A"}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Bico Padrão Instalado</dt>
              <dd className="font-semibold text-white">
                {activeModel.defaultNozzleMm > 0 ? `${activeModel.defaultNozzleMm} mm` : "N/A"}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Bicos Compatíveis</dt>
              <dd className="font-semibold text-slate-300 text-right">
                {activeModel.compatibleNozzles}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Aceleração Máxima</dt>
              <dd className="font-mono font-semibold text-sky-400">
                {activeModel.maxAccelerationMmS2.toLocaleString()} mm/s²
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Precisão / Resolução de Camada</dt>
              <dd className="font-semibold text-slate-300 text-right">
                {activeModel.precisionLayerHeight}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Câmara Aquecida</dt>
              <dd className="font-semibold text-amber-300 text-right">
                {activeModel.heatedChamber}
              </dd>
            </div>
          </dl>
        </div>

        {/* BLOCO 2: CONECTIVIDADE & RECURSOS INTELIGENTES */}
        <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-white uppercase tracking-wider">
            <span>🤖</span>
            <span>Sensores, IA & Conectividade</span>
          </div>

          <dl className="divide-y divide-slate-800/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Auto Nivelamento</dt>
              <dd className="font-semibold text-white text-right max-w-[65%]">
                {activeModel.autoLeveling}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Sensor de Filamento</dt>
              <dd className="font-semibold text-emerald-400 text-right max-w-[65%]">
                {activeModel.filamentSensor}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Câmera Integrada</dt>
              <dd className="font-semibold text-slate-200 text-right max-w-[65%]">
                {activeModel.camera}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Recursos de Inteligência Artificial</dt>
              <dd className="font-semibold text-purple-300 text-right max-w-[65%]">
                {activeModel.aiFeatures}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Conectividade de Rede</dt>
              <dd className="font-semibold text-slate-200 text-right">
                Wi-Fi: <strong className="text-white">{activeModel.wifi}</strong>
                <br />
                Ethernet: <strong className="text-white">{activeModel.ethernet}</strong>
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Sistema Operacional / Firmware</dt>
              <dd className="font-semibold text-white text-right max-w-[65%]">
                {activeModel.operatingSystem}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Fatiadores Recomendados</dt>
              <dd className="font-semibold text-emerald-300 text-right">
                {activeModel.recommendedSlicer}
              </dd>
            </div>
          </dl>
        </div>

        {/* BLOCO 3: ECONOMIA DA FARM & CUSTOS OPERACIONAIS */}
        <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-white uppercase tracking-wider">
            <span>⚡</span>
            <span>Energia & Custos Operacionais</span>
          </div>

          <dl className="divide-y divide-slate-800/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Potência Máxima de Pico</dt>
              <dd className="font-mono font-bold text-white">{activeModel.maxPowerW} W</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Consumo Médio Operacional</dt>
              <dd className="font-mono font-bold text-amber-400">
                {activeModel.avgPowerW} W ({activeModel.avgConsumptionKwh} kWh)
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Custo de Energia Estimado</dt>
              <dd className="font-mono font-bold text-emerald-400">
                {activeModel.energyCostPerHourBrl.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
                /hora <span className="text-[10px] text-slate-500 font-normal">(R$ 0,90/kWh)</span>
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Custo Estimado de Manutenção</dt>
              <dd className="font-mono font-bold text-sky-400">
                {activeModel.maintenanceCostPerHourBrl.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
                /hora
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Suporte a Multicolor / AMS</dt>
              <dd className="font-semibold text-purple-300 text-right">
                {activeModel.hasAmsSupport ? activeModel.amsName || "Sim" : "Não suportado nativo"}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Nível de Ruído</dt>
              <dd className="font-semibold text-slate-300">{activeModel.noiseLevelDb}</dd>
            </div>
          </dl>
        </div>

        {/* BLOCO 4: DIMENSÕES, PESO & VIDA ÚTIL DOS COMPONENTES */}
        <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold text-white uppercase tracking-wider">
            <span>⏳</span>
            <span>Físico & Vida Útil dos Componentes</span>
          </div>

          <dl className="divide-y divide-slate-800/60 text-xs">
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Dimensões Externas (L × P × A)</dt>
              <dd className="font-semibold text-white">{activeModel.dimensionsMm}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Peso Líquido</dt>
              <dd className="font-semibold text-white">{activeModel.weightKg} kg</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Vida Útil Bico (Nozzle)</dt>
              <dd className="font-semibold text-slate-300 text-right">
                {activeModel.lifespanComponents.nozzleHours}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Vida Útil Correias / Guias</dt>
              <dd className="font-semibold text-slate-300 text-right">
                {activeModel.lifespanComponents.beltsHours}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Vida Útil Ventoinhas</dt>
              <dd className="font-semibold text-slate-300 text-right">
                {activeModel.lifespanComponents.fansHours}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Vida Útil Engrenagens Extrusor</dt>
              <dd className="font-semibold text-slate-300 text-right">
                {activeModel.lifespanComponents.extruderGearsHours}
              </dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-400">Vida Útil Chapa PEI / Filme</dt>
              <dd className="font-semibold text-slate-300 text-right">
                {activeModel.lifespanComponents.peiPhoneHours}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* ================= MATERIAIS COMPATÍVEIS ================= */}
      <div className="rounded-2xl border border-slate-800 bg-[#0b1220] p-4 space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <span>🧵</span>
            <span>Materiais e Polímeros Compatíveis</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-semibold">
            {activeModel.compatibleMaterials.length} materiais certificados
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {activeModel.compatibleMaterials.map((mat) => (
            <span
              key={mat}
              className="rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-emerald-300"
            >
              {mat}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
