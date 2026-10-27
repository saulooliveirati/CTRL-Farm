"use client";

import { useState } from "react";
import type { MarketplaceProductRecord } from "@/lib/server-marketplace";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function MarketplaceProductModal({
  product,
  onClose,
}: {
  product: MarketplaceProductRecord;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "simulator">("overview");

  // Parâmetros do Simulador de Lucro
  const initialWeight = product.estimatedWeightG ?? 75;
  const initialTime = product.estimatedPrintTimeMinutes ?? 120;
  const [filamentPricePerKg, setFilamentPricePerKg] = useState(110);
  const [weightGrams, setWeightGrams] = useState(initialWeight);
  const [printTimeMin, setPrintTimeMin] = useState(initialTime);
  const [hourlyMachineRate, setHourlyMachineRate] = useState(1.5);
  const [marketplaceFeePct, setMarketplaceFeePct] = useState(14);
  const [packagingCost, setPackagingCost] = useState(3.5);

  const price = Number(product.currentPrice);
  const materialCost = (weightGrams * filamentPricePerKg) / 1000;
  const machineCost = (printTimeMin / 60) * hourlyMachineRate;
  const marketplaceFee = (price * marketplaceFeePct) / 100;
  const totalCost = materialCost + machineCost + marketplaceFee + packagingCost;
  const netProfit = Math.max(0, price - totalCost);
  const profitMarginPercent = (netProfit / price) * 100;
  const profitPerHour = printTimeMin > 0 ? netProfit / (printTimeMin / 60) : 0;

  // Renderização do gráfico SVG de 90 dias
  const snapshots = product.snapshots && product.snapshots.length > 0 ? product.snapshots : [];

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
        className="my-auto max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-[#0c1322] p-5 shadow-2xl sm:p-7 text-slate-200"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/10 text-xl text-cyan-400 border border-cyan-500/20">
              {product.source === "MERCADO_LIVRE"
                ? "🟡"
                : product.source === "SHOPEE"
                  ? "🟠"
                  : "🎵"}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-300">
                  {product.source.replace("_", " ")}
                </span>
                <span className="rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  ✓ 3D Confirmado ({Math.round(product.aiConfidence * 100)}%)
                </span>
              </div>
              <h2
                className="mt-1 text-base sm:text-lg font-bold text-white line-clamp-1"
                title={product.title}
              >
                {product.title}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Abas Internas */}
        <div className="mt-4 flex items-center gap-2 border-b border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "overview"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            🔬 Raio-X & Métricas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("simulator")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "simulator"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            💰 Simulador de Lucro Real
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === "history"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            📈 Histórico de Preço & Vendas
          </button>
        </div>

        {/* ================= ABA 1: VISÃO GERAL ================= */}
        {activeTab === "overview" && (
          <div className="mt-5 space-y-5 animate-in fade-in">
            {/* Cards de Métricas do Marketplace */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-3">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Preço Praticado
                </span>
                <span className="text-lg font-black text-white">
                  {currencyFormatter.format(Number(product.currentPrice))}
                </span>
                {product.originalPrice && (
                  <span className="text-[10px] text-slate-500 line-through block">
                    {currencyFormatter.format(Number(product.originalPrice))}
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-3">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Vendas Estimadas/Mês
                </span>
                <span className="text-lg font-black text-emerald-400">
                  ~{product.estimatedMonthlySales} un
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {product.totalSalesCount.toLocaleString("pt-BR")} total vendido
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-3">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Potencial de Venda
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-cyan-400">{product.salesPotential}</span>
                  <span className="text-[10px] text-slate-400">/ 100</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 rounded-full"
                    style={{ width: `${product.salesPotential}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-3">
                <span className="text-[10px] text-slate-400 block font-semibold">
                  Potencial de Lucro
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-emerald-400">
                    {product.profitPotential}
                  </span>
                  <span className="text-[10px] text-slate-400">/ 100</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 rounded-full"
                    style={{ width: `${product.profitPotential}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Parâmetros 3D Estimados */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                ⚙️ Especificações de Engenharia e Impressão 3D
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Material Indicado:</span>
                  <strong className="text-white font-mono">{product.estimatedMaterial}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Peso Estimado:</span>
                  <strong className="text-white">{product.estimatedWeightG ?? "—"} g</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Tempo de Mesa:</span>
                  <strong className="text-white">
                    {product.estimatedPrintTimeMinutes
                      ? `~${Math.round(product.estimatedPrintTimeMinutes / 60)}h ${product.estimatedPrintTimeMinutes % 60}m`
                      : "—"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Complexidade:</span>
                  <strong className="text-amber-400">{product.manufacturingComplexity}</strong>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Público-Alvo:</span>
                  <span className="text-slate-200">
                    {product.targetAudience ?? "Público Geral"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Sazonalidade:</span>
                  <span className="text-slate-200">{product.seasonality ?? "Ano Todo"}</span>
                </div>
              </div>
            </div>

            {/* Impressoras Compatíveis da Fazenda */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                🖨️ Compatibilidade de Hardware & Fazenda
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.recommendedPrinters.map((printer) => (
                  <span
                    key={printer}
                    className="rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs text-slate-200"
                  >
                    ✓ {printer}
                  </span>
                ))}
              </div>
            </div>

            {/* Link Externo */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">
                Vendedor: <strong>{product.sellerName ?? "Vendedor Marketplace"}</strong> (
                {product.sellerLocation ?? "Brasil"})
              </span>
              <a
                href={product.externalUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-700"
              >
                <span>Acessar Anúncio no {product.source.replace("_", " ")}</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        )}

        {/* ================= ABA 2: SIMULADOR DE LUCRO ================= */}
        {activeTab === "simulator" && (
          <div className="mt-5 space-y-5 animate-in fade-in">
            <p className="text-xs text-slate-400">
              Calcule exatamente quanto a sua fazenda de impressão 3D lucrará produzindo este
              produto, considerando o custo do seu filamento e energia.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-300">
                Preço do Filamento (R$/kg)
                <input
                  type="number"
                  min="50"
                  max="400"
                  value={filamentPricePerKg}
                  onChange={(e) => setFilamentPricePerKg(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-xs text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="text-xs font-semibold text-slate-300">
                Peso Real da Peça com Suportes (g)
                <input
                  type="number"
                  min="5"
                  max="2000"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-xs text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="text-xs font-semibold text-slate-300">
                Tempo Estimado de Impressão (minutos)
                <input
                  type="number"
                  min="10"
                  max="1440"
                  value={printTimeMin}
                  onChange={(e) => setPrintTimeMin(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-xs text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="text-xs font-semibold text-slate-300">
                Taxa de Comissão do Marketplace (%)
                <input
                  type="number"
                  min="0"
                  max="35"
                  value={marketplaceFeePct}
                  onChange={(e) => setMarketplaceFeePct(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-xs text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="text-xs font-semibold text-slate-300">
                Custo Horário de Máquina &amp; Energia (R$/h)
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="20"
                  value={hourlyMachineRate}
                  onChange={(e) => setHourlyMachineRate(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-xs text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="text-xs font-semibold text-slate-300">
                Embalagem &amp; Insumos de Envio (R$)
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="50"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-xs text-white outline-none focus:border-emerald-400"
                />
              </label>
            </div>

            {/* Resultado da Simulação */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
                <span className="text-xs font-bold text-emerald-300">
                  Resultado Financeiro por Unidade
                </span>
                <span className="rounded bg-emerald-500/20 px-2.5 py-0.5 text-xs font-black text-emerald-300">
                  {profitMarginPercent.toFixed(1)}% Margem Líquida
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-xl bg-[#070c16]/80 p-3">
                  <span className="text-[10px] text-slate-400 block">Preço de Venda</span>
                  <strong className="text-sm text-white">{currencyFormatter.format(price)}</strong>
                </div>

                <div className="rounded-xl bg-[#070c16]/80 p-3">
                  <span className="text-[10px] text-slate-400 block">Custo Total Prod.</span>
                  <strong className="text-sm text-rose-400">
                    {currencyFormatter.format(totalCost)}
                  </strong>
                </div>

                <div className="rounded-xl bg-[#070c16]/80 p-3">
                  <span className="text-[10px] text-slate-400 block">Lucro Líquido</span>
                  <strong className="text-base text-emerald-400">
                    {currencyFormatter.format(netProfit)}
                  </strong>
                </div>

                <div className="rounded-xl bg-[#070c16]/80 p-3">
                  <span className="text-[10px] text-slate-400 block">Lucro / Hora de Mesa</span>
                  <strong className="text-base text-cyan-300">
                    {currencyFormatter.format(profitPerHour)}/h
                  </strong>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-slate-400 text-center">
                Com vendas mensais de ~{product.estimatedMonthlySales} un, o faturamento estimado é
                de{" "}
                <strong className="text-white">
                  {currencyFormatter.format(product.estimatedMonthlySales * price)}
                </strong>{" "}
                com lucro líquido mensal de{" "}
                <strong className="text-emerald-300">
                  {currencyFormatter.format(product.estimatedMonthlySales * netProfit)}
                </strong>
                .
              </p>
            </div>
          </div>
        )}

        {/* ================= ABA 3: HISTÓRICO 90 DIAS ================= */}
        {activeTab === "history" && (
          <div className="mt-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Evolução Diária de Preço e Volume de Vendas
              </span>
              <span className="text-[10px] text-slate-400">Últimos 90 dias monitorados</span>
            </div>

            {/* Sparkline / Histórico Visual SVG */}
            <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-4">
              <div className="h-44 w-full flex items-end gap-1.5 pt-4">
                {snapshots.length > 0 ? (
                  snapshots.map((snap, i) => {
                    const maxSales = Math.max(1, ...snapshots.map((s) => s.estimatedSales));
                    const heightPercent = Math.max(
                      15,
                      Math.round((snap.estimatedSales / maxSales) * 100),
                    );
                    return (
                      <div
                        key={snap.id || i}
                        className="flex-1 flex flex-col items-center gap-1 group relative cursor-pointer"
                      >
                        {/* Tooltip Hover */}
                        <div className="absolute bottom-full mb-1 hidden group-hover:block z-20 rounded bg-slate-900 border border-slate-700 p-1.5 text-[9px] text-white whitespace-nowrap shadow-lg">
                          <span>{currencyFormatter.format(Number(snap.price))}</span>
                          <span className="block text-emerald-400 font-bold">
                            {snap.estimatedSales} vds
                          </span>
                        </div>
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-emerald-400 transition-all group-hover:brightness-125"
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full flex items-center justify-center text-xs text-slate-500 py-12">
                    Histórico inicial registrado hoje. O tracking diário enriquecerá o gráfico a
                    cada 24h.
                  </div>
                )}
              </div>
              <div className="flex justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-800/80 mt-2">
                <span>90 dias atrás</span>
                <span>
                  Tendência:{" "}
                  {product.trend === "UP"
                    ? "📈 Alta"
                    : product.trend === "DOWN"
                      ? "📉 Queda"
                      : "➖ Estável"}
                </span>
                <span>Hoje</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
