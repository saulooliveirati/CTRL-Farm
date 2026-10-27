"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { SupplierRecord } from "@/lib/server-suppliers";
import { SupplierQuickCreate } from "@/components/suppliers/supplier-quick-create";
import { FilamentSpoolIcon } from "@/components/icons/filament-spool-icon";
import { SpoolGraphic } from "./spool-graphic";
import { ColorPickerModal, parseColor, FILAMENT_COLOR_PRESETS } from "./color-picker-modal";
import { FilamentEditModal } from "./filament-edit-modal";
import { MaterialDetailModal } from "./material-detail-modal";
import { MaterialHoverCard } from "./material-hover-card";
import {
  getAllMaterialBrands,
  getMaterialsByBrand,
  findMaterialDatabaseItem,
} from "@/lib/material-database";

const materials = ["PLA", "PETG", "ABS", "ASA", "TPU", "NYLON", "PC", "OTHER"] as const;
const materialLabels: Record<(typeof materials)[number], string> = {
  PLA: "PLA",
  PETG: "PETG",
  ABS: "ABS",
  ASA: "ASA",
  TPU: "TPU",
  NYLON: "Nylon",
  PC: "PC",
  OTHER: "Outro",
};

const weightFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type DisplayMode = "cards" | "list" | "details";
type StockFilter = "all" | "in_stock" | "low_stock" | "empty";

export function FilamentsManager({
  initialFilaments,
  initialSuppliers,
  initialError,
}: {
  initialFilaments: FilamentRecord[];
  initialSuppliers: SupplierRecord[];
  initialError: string;
}) {
  const [filaments, setFilaments] = useState<FilamentRecord[]>(initialFilaments);
  const [suppliers, setSuppliers] = useState<SupplierRecord[]>(initialSuppliers);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);

  // Modais de Criação e Edição
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [editingFilament, setEditingFilament] = useState<FilamentRecord | null>(null);
  const [viewingFilament, setViewingFilament] = useState<FilamentRecord | null>(null);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>("");

  // Filtros e Visualização
  const [query, setQuery] = useState("");
  const [materialFilter, setMaterialFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [mode, setMode] = useState<DisplayMode>("cards");

  // Estado do formulário de criação
  const [material, setMaterial] = useState<(typeof materials)[number]>("PLA");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("Preto (#18181b)");
  const [initialWeight, setInitialWeight] = useState("1000");
  const [currentWeight, setCurrentWeight] = useState("1000");
  const [price, setPrice] = useState("");
  const [lot, setLot] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const parsedCurrentColor = parseColor(color);

  // Filtragem inteligente de filamentos
  const visibleFilaments = useMemo(() => {
    const search = query.trim().toLocaleLowerCase("pt-BR");
    return filaments.filter((item) => {
      if (materialFilter && item.material !== materialFilter) return false;

      if (stockFilter === "low_stock" && (item.currentWeightG <= 0 || item.currentWeightG >= 300)) {
        return false;
      }
      if (stockFilter === "empty" && item.currentWeightG > 0) {
        return false;
      }
      if (stockFilter === "in_stock" && item.currentWeightG < 300) {
        return false;
      }

      if (!search) return true;

      const fullText = [item.material, item.brand, item.color, item.lot, item.supplier?.name]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");

      return fullText.includes(search);
    });
  }, [filaments, materialFilter, stockFilter, query]);

  // Estatísticas do Inventário
  const totalWeightG = filaments.reduce((total, item) => total + item.currentWeightG, 0);
  const totalCapacityG = filaments.reduce((total, item) => total + item.initialWeightG, 0);
  const knownValue = filaments.reduce(
    (total, item) =>
      total +
      (item.price === null || item.initialWeightG <= 0
        ? 0
        : (Number(item.price) * item.currentWeightG) / item.initialWeightG),
    0,
  );
  const lowStockCount = filaments.filter(
    (item) => item.currentWeightG > 0 && item.currentWeightG < 300,
  ).length;
  const emptyStockCount = filaments.filter((item) => item.currentWeightG === 0).length;

  // Cadastrar nova bobina
  async function createFilament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!color.trim()) {
      setError("Selecione a cor do filamento.");
      return;
    }
    const initW = Number(initialWeight);
    const currW = Number(currentWeight);
    if (currW > initW) {
      setError("O peso atual não pode superar o peso inicial da bobina.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/filaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material,
          brand: brand.trim(),
          color: color.trim(),
          initialWeightG: initW,
          currentWeightG: currW,
          ...(price && { price: Number(price) }),
          ...(lot.trim() && { lot: lot.trim() }),
          ...(supplierId && { supplierId }),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Não foi possível cadastrar o filamento.");
      }
      setFilaments((items) => [result.data, ...items]);
      setCreateModalOpen(false);
      setBrand("");
      setColor("Preto (#18181b)");
      setPrice("");
      setLot("");
      setInitialWeight("1000");
      setCurrentWeight("1000");
      setSupplierId("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao cadastrar.");
    } finally {
      setSaving(false);
    }
  }

  // Salvar ajuste manual de peso
  async function saveWeight(filament: FilamentRecord, overrideGrams?: number) {
    const rawValue = overrideGrams !== undefined ? overrideGrams : weights[filament.id];
    const grams = Number(rawValue ?? filament.currentWeightG);

    if (!Number.isInteger(grams) || grams < 0 || grams > filament.initialWeightG) {
      setError(
        `Informe um peso válido entre 0 e ${filament.initialWeightG}g para ${filament.brand} ${filament.color}.`,
      );
      return;
    }

    try {
      const response = await fetch(`/api/filaments/${filament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentWeightG: grams }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Não foi possível atualizar o peso.");
      }

      setFilaments((items) =>
        items.map((item) => (item.id === filament.id ? (result.data as FilamentRecord) : item)),
      );
      setWeights((items) => {
        const next = { ...items };
        delete next[filament.id];
        return next;
      });
      setSavedSuccessId(filament.id);
      setTimeout(() => setSavedSuccessId(null), 2500);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao salvar peso.");
    }
  }

  // Ajuste rápido de incremento ou decremento (ex.: -50g após uma impressão)
  function quickAdjustDelta(filament: FilamentRecord, deltaGrams: number) {
    const currentVal = Number(weights[filament.id] ?? filament.currentWeightG);
    const nextVal = Math.max(0, Math.min(filament.initialWeightG, currentVal + deltaGrams));
    setWeights((state) => ({ ...state, [filament.id]: String(nextVal) }));
  }

  // Remover filamento
  async function removeFilament(filament: FilamentRecord) {
    const parsed = parseColor(filament.color);
    if (
      !window.confirm(
        `Tem certeza que deseja remover a bobina ${filament.material} ${filament.brand} (${parsed.name}) do estoque?`,
      )
    ) {
      return;
    }
    try {
      const response = await fetch(`/api/filaments/${filament.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Não foi possível remover a bobina.");
      }
      setFilaments((items) => items.filter((item) => item.id !== filament.id));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erro ao remover filamento.");
    }
  }

  const field =
    "h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-sm text-white outline-none transition focus:border-emerald-400";
  const label = "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-300";

  return (
    <div className="mx-auto max-w-[1560px] space-y-6 text-slate-100">
      {/* Cabeçalho Premium com Ícone de Bobina */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              <FilamentSpoolIcon className="h-3.5 w-3.5" />
              Estoque de Materiais
            </span>
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-2xl font-black tracking-tight text-white sm:text-3xl">
            <span className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/20 to-slate-900 shadow-md shadow-emerald-950/20">
              <FilamentSpoolIcon className="h-6 w-6 text-emerald-400" />
            </span>
            Filamentos &amp; Carretéis
          </h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Gestão visual de bobinas, controle de consumo em tempo real, ajuste de peso e histórico
            de custos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setError("");
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 active:scale-95"
          >
            <FilamentSpoolIcon className="h-4.5 w-4.5" />
            <span>Cadastrar Filamento</span>
          </button>
        </div>
      </header>

      {/* Alerta de erro geral */}
      {error && !createModalOpen && !editingFilament && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-rose-900 bg-rose-950/60 p-3.5 text-xs text-rose-200"
        >
          <span>⚠ {error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* HUD de Métricas e Indicadores de Estoque */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Total de Bobinas */}
        <article className="interactive-card relative overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] p-4.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Bobinas Cadastradas</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <FilamentSpoolIcon className="h-4.5 w-4.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <strong className="text-2xl font-black text-white">{filaments.length}</strong>
            <span className="text-xs text-slate-400">carretéis</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>
              {filaments.filter((f) => f.currentWeightG >= 300).length} ativas e prontas para uso
            </span>
          </div>
        </article>

        {/* Card 2: Peso Total Disponível */}
        <article className="interactive-card relative overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] p-4.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Material em Estoque</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-blue-400">
              ⚖
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <strong className="text-2xl font-black text-white">
              {weightFormatter.format(totalWeightG / 1000)} kg
            </strong>
            <span className="text-xs text-slate-400">
              / {weightFormatter.format(totalCapacityG / 1000)} kg total
            </span>
          </div>
          {/* Barra de progresso geral */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              style={{
                width: `${totalCapacityG > 0 ? (totalWeightG / totalCapacityG) * 100 : 0}%`,
              }}
            />
          </div>
        </article>

        {/* Card 3: Valor Financeiro em Estoque */}
        <article className="interactive-card relative overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] p-4.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Valor em Material</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/10 font-bold text-emerald-400">
              R$
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <strong className="text-2xl font-black text-white">
              {currencyFormatter.format(knownValue)}
            </strong>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {filaments.some((item) => item.price === null)
              ? "Estimativa residual parcial (há bobinas sem preço)"
              : "Calculado proporcionalmente ao peso restante"}
          </p>
        </article>

        {/* Card 4: Níveis Críticos & Esgotados */}
        <article className="interactive-card relative overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] p-4.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">Atenção no Estoque</p>
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
              ⚠
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div>
              <strong className="text-2xl font-black text-amber-400">{lowStockCount}</strong>
              <span className="ml-1 text-[11px] text-slate-400">baixo (&lt;300g)</span>
            </div>
            {emptyStockCount > 0 && (
              <div className="border-l border-slate-800 pl-3">
                <strong className="text-2xl font-black text-rose-400">{emptyStockCount}</strong>
                <span className="ml-1 text-[11px] text-slate-400">vazios (0g)</span>
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {lowStockCount + emptyStockCount === 0
              ? "Todos os carretéis estão com estoque saudável"
              : "Requer atenção para não faltar durante impressões longas"}
          </p>
        </article>
      </section>

      {/* Barra de Filtros, Busca e Modos de Visualização */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-[#0d1424] p-3">
        <div className="flex min-w-[260px] flex-1 items-center gap-2">
          {/* Input de Busca */}
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-2.5 text-xs text-slate-500">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por marca, material, cor, lote ou fornecedor..."
              className="h-9 w-full rounded-xl border border-slate-700/80 bg-[#070c16] pl-9 pr-3 text-xs text-white outline-none transition focus:border-emerald-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro por Material */}
          <select
            value={materialFilter}
            onChange={(e) => setMaterialFilter(e.target.value)}
            className="h-9 rounded-xl border border-slate-700/80 bg-[#070c16] px-3 text-xs text-slate-200 outline-none transition focus:border-emerald-400"
          >
            <option value="">Todos os Materiais</option>
            {materials.map((m) => (
              <option key={m} value={m}>
                {materialLabels[m]}
              </option>
            ))}
          </select>

          {/* Filtro por Situação de Estoque */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            className="h-9 rounded-xl border border-slate-700/80 bg-[#070c16] px-3 text-xs text-slate-200 outline-none transition focus:border-emerald-400"
          >
            <option value="all">Todas as Situações</option>
            <option value="in_stock">Estoque Normal (&gt; 300g)</option>
            <option value="low_stock">Estoque Baixo (&lt; 300g)</option>
            <option value="empty">Esgotadas (0g)</option>
          </select>
        </div>

        {/* Alternador de Modo de Exibição */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#070c16] p-1">
          <button
            type="button"
            onClick={() => setMode("cards")}
            title="Visualização em Cards de Carretel"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === "cards"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>▦</span>
            <span>Cards</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("list")}
            title="Visualização em Lista / Tabela"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === "list"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>☷</span>
            <span>Lista</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("details")}
            title="Visualização Detalhada"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === "details"
                ? "bg-emerald-500 text-slate-950 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>▤</span>
            <span>Detalhada</span>
          </button>
        </div>
      </section>

      {/* Conteúdo Principal: Carretéis Visuais ou Tabela */}
      {visibleFilaments.length === 0 ? (
        <section className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-[#0a101d] p-16 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-800/60 text-slate-500">
            <FilamentSpoolIcon className="h-8 w-8" />
          </span>
          <h2 className="mt-4 text-base font-bold text-white">Nenhum filamento encontrado</h2>
          <p className="mt-1 max-w-md text-xs text-slate-400">
            {filaments.length > 0
              ? "Nenhum filamento atende aos filtros ou termo de busca selecionados. Tente limpar os filtros."
              : "Nenhum filamento cadastrado até o momento. Comece registrando suas bobinas para controlar o consumo!"}
          </p>
          {filaments.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setMaterialFilter("");
                setStockFilter("all");
              }}
              className="mt-4 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              Limpar Filtros
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400"
            >
              <FilamentSpoolIcon className="h-4 w-4" />
              <span>Cadastrar Primeira Bobina</span>
            </button>
          )}
        </section>
      ) : mode === "cards" ? (
        /* ================= MODO CARDS VISUAIS ================= */
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleFilaments.map((item) => {
            const parsed = parseColor(item.color);
            const ratio = item.initialWeightG > 0 ? item.currentWeightG / item.initialWeightG : 0;
            const percent = Math.round(ratio * 100);
            const isLow = item.currentWeightG > 0 && item.currentWeightG < 300;
            const isEmpty = item.currentWeightG === 0;
            const draftWeight = weights[item.id];
            const isDirty = draftWeight !== undefined;
            const isSaved = savedSuccessId === item.id;

            return (
              <article
                key={item.id}
                className="interactive-card flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/90 bg-[#101827] p-4.5 shadow-lg transition-all hover:border-slate-700"
              >
                <div>
                  {/* Topo do Card: Material, Status e Ação de Editar */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-0.5 text-[11px] font-bold text-white">
                        {item.material}
                      </span>
                      {isEmpty ? (
                        <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                          Esgotado
                        </span>
                      ) : isLow ? (
                        <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 animate-pulse">
                          Estoque Baixo
                        </span>
                      ) : (
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                          {percent}% Disponível
                        </span>
                      )}
                    </div>

                    {/* Ações: Ficha Técnica e Edição */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setViewingFilament(item)}
                        title="Ficha técnica do material (Wiki / TDS)"
                        className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-2 py-1 text-xs font-semibold text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-900/40"
                      >
                        🔬 Ficha
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingFilament(item)}
                        title="Editar informações do filamento"
                        className="rounded-lg border border-slate-700/80 p-1.5 text-xs text-slate-400 transition hover:border-slate-500 hover:bg-slate-800 hover:text-white"
                      >
                        ✏
                      </button>
                    </div>
                  </div>

                  {/* Representação Visual do Carretel 3D com Hover Card da Base de Conhecimento */}
                  <MaterialHoverCard
                    brand={item.brand}
                    material={item.material}
                    onOpenDetails={() => setViewingFilament(item)}
                  >
                    <div className="my-3.5 flex cursor-pointer items-center gap-3.5 rounded-xl border border-slate-800/80 bg-[#070c16]/80 p-3 transition hover:border-cyan-500/40 hover:bg-[#0c1527]">
                      <SpoolGraphic colorHex={parsed.hex} ratio={ratio} size={64} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="truncate text-xs font-semibold text-slate-400">
                            {item.brand}
                          </p>
                          <span className="text-[10px] text-cyan-400/80">🔬 Detalhes</span>
                        </div>
                        <h2 className="truncate text-sm font-bold text-white" title={parsed.name}>
                          {parsed.name}
                        </h2>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-white/20"
                            style={{ backgroundColor: parsed.hex }}
                          />
                          <span className="font-mono text-[11px] text-slate-400">
                            {parsed.hex.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </MaterialHoverCard>

                  {/* Barra de Progresso do Estoque */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">
                        {weightFormatter.format(item.currentWeightG)} g
                      </span>
                      <span className="text-slate-400">
                        de {weightFormatter.format(item.initialWeightG)} g
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isEmpty
                            ? "bg-rose-500"
                            : isLow
                              ? "bg-amber-400"
                              : "bg-gradient-to-r from-emerald-500 to-cyan-400"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                      />
                    </div>
                  </div>

                  {/* Informações Complementares: Preço e Fornecedor */}
                  <div className="mt-3 flex items-center justify-between border-t border-slate-800/80 pt-2 text-[11px] text-slate-400">
                    <span title="Valor do material restante">
                      {item.price
                        ? currencyFormatter.format(
                            (Number(item.price) * item.currentWeightG) / item.initialWeightG,
                          )
                        : "Sem preço"}
                    </span>
                    <span
                      className="truncate max-w-[120px]"
                      title={item.supplier?.name ?? "Sem fornecedor"}
                    >
                      {item.supplier?.name ?? "Fornecedor s/v"}
                    </span>
                  </div>
                </div>

                {/* Seção de Ajuste Manual de Peso do Usuário */}
                <div className="mt-3.5 space-y-2 border-t border-slate-800/80 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Ajuste Manual de Peso
                    </span>
                    {isSaved && (
                      <span className="text-[10px] font-bold text-emerald-400 animate-in fade-in">
                        ✓ Salvo
                      </span>
                    )}
                  </div>

                  {/* Botões Rápidos de Incremento / Decremento */}
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => quickAdjustDelta(item, -100)}
                      title="Consumiu 100g de filamento"
                      className="flex-1 rounded-md border border-slate-700 bg-slate-800/60 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      -100g
                    </button>
                    <button
                      type="button"
                      onClick={() => quickAdjustDelta(item, -50)}
                      title="Consumiu 50g de filamento"
                      className="flex-1 rounded-md border border-slate-700 bg-slate-800/60 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      -50g
                    </button>
                    <button
                      type="button"
                      onClick={() => quickAdjustDelta(item, -10)}
                      title="Consumiu 10g de filamento"
                      className="flex-1 rounded-md border border-slate-700 bg-slate-800/60 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      -10g
                    </button>
                    <button
                      type="button"
                      onClick={() => quickAdjustDelta(item, 50)}
                      title="Adicionou 50g ao carretel"
                      className="flex-1 rounded-md border border-slate-700 bg-slate-800/60 py-1 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                    >
                      +50g
                    </button>
                  </div>

                  {/* Input direto de pesagem com botão de Salvar */}
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        max={item.initialWeightG}
                        value={draftWeight ?? item.currentWeightG}
                        onChange={(e) =>
                          setWeights((state) => ({ ...state, [item.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveWeight(item);
                          }
                        }}
                        className={`h-8 w-full rounded-lg border bg-[#070c16] px-2.5 text-xs text-white outline-none transition ${
                          isDirty ? "border-amber-400 bg-amber-950/20" : "border-slate-700"
                        }`}
                      />
                      <span className="pointer-events-none absolute right-2.5 top-2 text-[10px] text-slate-400">
                        g
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!isDirty}
                      onClick={() => void saveWeight(item)}
                      className={`h-8 rounded-lg px-3 text-xs font-bold transition ${
                        isDirty
                          ? "bg-emerald-500 text-slate-950 shadow hover:bg-emerald-400"
                          : "bg-slate-800/50 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      Salvar
                    </button>

                    <button
                      type="button"
                      onClick={() => void removeFilament(item)}
                      title="Remover bobina do inventário"
                      className="h-8 rounded-lg border border-slate-700 px-2 text-xs text-slate-400 transition hover:border-rose-800 hover:bg-rose-950/30 hover:text-rose-300"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        /* ================= MODO LISTA / TABELA DETALHADA ================= */
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827]">
          <div className="flex items-center justify-between border-b border-slate-800 p-4">
            <h2 className="font-bold text-white">Inventário de Filamentos</h2>
            <span className="text-xs text-slate-400">
              {visibleFilaments.length} bobinas listadas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-[#0b1220] text-xs font-semibold text-slate-400">
                <tr>
                  <th className="px-4 py-3">Filamento &amp; Cor</th>
                  <th className="px-4 py-3">Fornecedor</th>
                  <th className="px-4 py-3">Capacidade</th>
                  <th className="px-4 py-3">Estoque Disponível</th>
                  <th className="px-4 py-3">Ajuste de Peso</th>
                  <th className="px-4 py-3">Valor Estimado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {visibleFilaments.map((item) => {
                  const parsed = parseColor(item.color);
                  const ratio =
                    item.initialWeightG > 0 ? item.currentWeightG / item.initialWeightG : 0;
                  const percent = Math.round(ratio * 100);
                  const isDirty = weights[item.id] !== undefined;

                  return (
                    <tr key={item.id} className="transition hover:bg-slate-800/30">
                      {/* Carretel e Especificação */}
                      <td className="px-4 py-3">
                        <MaterialHoverCard
                          brand={item.brand}
                          material={item.material}
                          onOpenDetails={() => setViewingFilament(item)}
                        >
                          <div className="flex cursor-pointer items-center gap-3">
                            <SpoolGraphic colorHex={parsed.hex} ratio={ratio} size={42} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                <span>{item.material}</span>
                                <span className="text-slate-400">·</span>
                                <span>{item.brand}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full border border-white/20"
                                  style={{ backgroundColor: parsed.hex }}
                                />
                                <span>{parsed.name}</span>
                                {mode === "details" && item.lot && (
                                  <span className="font-mono text-[10px] text-slate-500">
                                    Lote: {item.lot}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </MaterialHoverCard>
                      </td>

                      {/* Fornecedor */}
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {item.supplier?.name ?? "—"}
                      </td>

                      {/* Peso inicial */}
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {weightFormatter.format(item.initialWeightG)} g
                      </td>

                      {/* Estoque atual com indicador de progresso */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-white">
                              {weightFormatter.format(item.currentWeightG)} g
                            </span>
                            <span className="text-[10px] text-slate-400">({percent}%)</span>
                          </div>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-emerald-400"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Ajuste manual rápido */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={item.initialWeightG}
                            value={weights[item.id] ?? item.currentWeightG}
                            onChange={(e) =>
                              setWeights((state) => ({ ...state, [item.id]: e.target.value }))
                            }
                            className={`h-8 w-20 rounded-lg border bg-[#070c16] px-2 text-xs text-white outline-none ${
                              isDirty ? "border-amber-400" : "border-slate-700"
                            }`}
                          />
                          <span className="text-xs text-slate-400">g</span>
                          {isDirty && (
                            <button
                              type="button"
                              onClick={() => void saveWeight(item)}
                              className="rounded-lg bg-emerald-500 px-2 py-1 text-[11px] font-bold text-slate-950 transition hover:bg-emerald-400"
                            >
                              Salvar
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Valor em estoque */}
                      <td className="px-4 py-3 text-xs text-slate-300">
                        {item.price
                          ? currencyFormatter.format(
                              (Number(item.price) * item.currentWeightG) / item.initialWeightG,
                            )
                          : "—"}
                      </td>

                      {/* Botões de Ação */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setViewingFilament(item)}
                            title="Ficha técnica (Wiki / TDS)"
                            className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 p-1.5 text-xs text-cyan-300 transition hover:border-cyan-400 hover:bg-cyan-900/40"
                          >
                            🔬
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingFilament(item)}
                            title="Editar filamento"
                            className="rounded-lg border border-slate-700 p-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
                          >
                            ✏
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeFilament(item)}
                            title="Excluir filamento"
                            className="rounded-lg border border-slate-700 p-1.5 text-xs text-rose-400 transition hover:border-rose-800 hover:bg-rose-950/30"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ================= MODAL DE CADASTRO DE FILAMENTO ================= */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setCreateModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-filament-title"
            className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl sm:p-6"
          >
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <SpoolGraphic colorHex={parsedCurrentColor.hex} ratio={1} size={48} />
                <div>
                  <h2 id="create-filament-title" className="text-lg font-bold text-white">
                    Cadastrar Nova Bobina de Filamento
                  </h2>
                  <p className="text-xs text-slate-400">
                    Registre o material, peso, marca e paleta de cor para rastrear seu consumo.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setCreateModalOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl border border-rose-900 bg-rose-950/60 p-3 text-xs text-rose-200"
              >
                {error}
              </p>
            )}

            <form onSubmit={createFilament} className="mt-5 grid gap-4 sm:grid-cols-2">
              {/* Marca / Fabricante com Opção Genérico em Destaque */}
              <label className={label}>
                Fabricante / Marca *
                <select
                  value={
                    getAllMaterialBrands().includes(brand) ? brand : brand ? "Outro" : "Genérico"
                  }
                  onChange={(e) => {
                    const val = e.target.value === "Outro" ? "" : e.target.value;
                    setBrand(val);
                    const brandMaterials = getMaterialsByBrand(val);
                    if (brandMaterials.length > 0) {
                      const first = brandMaterials[0]!;
                      setSelectedMaterialType(first.name);
                      setMaterial(first.category);
                      if (!lot) setLot(`LOTE-${new Date().getFullYear()}-${first.category}-01`);
                    } else {
                      setSelectedMaterialType("");
                    }
                  }}
                  className={field}
                >
                  <option value="Genérico">📦 Genérico (Universal / Sem Marca)</option>
                  {getAllMaterialBrands()
                    .filter((b) => b !== "Genérico")
                    .map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  <option value="Outro">Outra Marca (Digitar Manualmente)</option>
                </select>
              </label>

              {/* Se for marca personalizada ou Outro */}
              {(!getAllMaterialBrands().includes(brand) || brand === "") && (
                <label className={label}>
                  Nome da Marca Personalizada *
                  <input
                    required
                    maxLength={80}
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Digite o nome da marca/fabricante"
                    className={field}
                  />
                </label>
              )}

              {/* Tipo de Material Pré-Cadastrado da Base */}
              <label className={label}>
                Tipo / Linha do Material (Base de Dados)
                {getMaterialsByBrand(brand).length > 0 ? (
                  <select
                    value={
                      getMaterialsByBrand(brand).some((m) => m.name === selectedMaterialType)
                        ? selectedMaterialType
                        : "Outro"
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedMaterialType(val);
                      const found = getMaterialsByBrand(brand).find((m) => m.name === val);
                      if (found) {
                        setMaterial(found.category);
                        if (!lot) setLot(`LOTE-${new Date().getFullYear()}-${found.category}-01`);
                      }
                    }}
                    className={field}
                  >
                    {getMaterialsByBrand(brand).map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name} ({m.technology} · {m.category})
                      </option>
                    ))}
                    <option value="Outro">Outro Composto / Personalizado</option>
                  </select>
                ) : (
                  <input
                    value={selectedMaterialType}
                    onChange={(e) => setSelectedMaterialType(e.target.value)}
                    placeholder="Ex.: PLA+, PETG XT, Resina 8K"
                    className={field}
                  />
                )}
              </label>

              {/* Categoria Oficial no Sistema */}
              <label className={label}>
                Categoria do Polímero *
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as (typeof materials)[number])}
                  className={field}
                >
                  {materials.map((m) => (
                    <option key={m} value={m}>
                      {materialLabels[m]}
                    </option>
                  ))}
                </select>
              </label>

              {/* Card Contextual com Ficha Técnica da Base */}
              {(() => {
                const foundItem = findMaterialDatabaseItem(
                  brand || "Genérico",
                  selectedMaterialType || material,
                );
                if (!foundItem) return null;
                return (
                  <div className="sm:col-span-2 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                        <span>🔬 Ficha Técnica Vinculada:</span>
                        <span className="text-white">{foundItem.name}</span>
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] text-emerald-400">
                          {foundItem.technology}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Densidade: {foundItem.properties.densityGcm3} g/cm³
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4 pt-0.5">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Temp. Bico Ideal:</span>
                        <strong className="text-rose-400 font-mono">
                          {foundItem.printProfile.recommendedNozzleTempC > 0
                            ? `${foundItem.printProfile.recommendedNozzleTempC}°C`
                            : "N/A"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Temp. Mesa Ideal:</span>
                        <strong className="text-amber-400 font-mono">
                          {foundItem.printProfile.recommendedBedTempC > 0
                            ? `${foundItem.printProfile.recommendedBedTempC}°C`
                            : "N/A"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Resist. Tração:</span>
                        <strong className="text-emerald-400">
                          {foundItem.properties.tensileStrengthMpa}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          Fatiador Recomendado:
                        </span>
                        <strong className="text-sky-300 truncate block">
                          {foundItem.printProfile.recommendedSlicers[0]}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Seletor de Cor Interativo */}
              <div className="sm:col-span-2">
                <span className="block text-xs font-semibold text-slate-300">
                  Cor do Filamento *
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-[#070c16] p-3">
                  <span
                    className="h-8 w-8 shrink-0 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: parsedCurrentColor.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">
                      {parsedCurrentColor.name}
                    </p>
                    <p className="font-mono text-xs text-emerald-400">
                      {parsedCurrentColor.hex.toUpperCase()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setColorPickerOpen(true)}
                    className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-white"
                  >
                    🎨 Abrir Paleta &amp; Seletor
                  </button>
                </div>

                {/* Atalhos rápidos de cores populares */}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Atalhos rápidos:</span>
                  {FILAMENT_COLOR_PRESETS.slice(0, 7).map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => setColor(`${p.name} (${p.hex})`)}
                      className="flex items-center gap-1 rounded-md border border-slate-800 bg-[#070c16] px-2 py-0.5 text-[10px] text-slate-300 transition hover:border-slate-600 hover:text-white"
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.hex }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className={label}>
                Peso da Bobina Cheia (g) *
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={initialWeight}
                  onChange={(e) => setInitialWeight(e.target.value)}
                  className={field}
                />
              </label>

              <label className={label}>
                Peso Atual Disponível (g) *
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  className={field}
                />
              </label>

              <label className={label}>
                Preço de Custo (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex.: 99.90"
                  className={field}
                />
              </label>

              <label className={label}>
                Lote de Fabricação
                <input
                  maxLength={100}
                  value={lot}
                  onChange={(e) => setLot(e.target.value)}
                  placeholder="Ex.: LOT-2026-X1"
                  className={field}
                />
              </label>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">Fornecedor</span>
                  <SupplierQuickCreate
                    onCreated={(newSup) => {
                      setSuppliers((items) => [newSup, ...items]);
                      setSupplierId(newSup.id);
                    }}
                  />
                </div>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={`mt-1.5 ${field}`}
                >
                  <option value="">Nenhum fornecedor vinculado</option>
                  {suppliers.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-2 flex items-center justify-end gap-3 sm:col-span-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/25 disabled:opacity-60"
                >
                  <FilamentSpoolIcon className="h-4 w-4" />
                  <span>{saving ? "Salvando…" : "Salvar Bobina"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub-modal da Paleta de Cores para o formulário de cadastro */}
      <ColorPickerModal
        isOpen={colorPickerOpen}
        initialColor={color}
        onClose={() => setColorPickerOpen(false)}
        onSelectColor={(formatted) => setColor(formatted)}
      />

      {/* ================= MODAL DE EDIÇÃO DE PRODUTO CADASTRADO ================= */}
      {editingFilament && (
        <FilamentEditModal
          filament={editingFilament}
          suppliers={suppliers}
          onClose={() => setEditingFilament(null)}
          onUpdated={(updated) => {
            setFilaments((items) => items.map((item) => (item.id === updated.id ? updated : item)));
          }}
          onSupplierCreated={(newSup) => {
            setSuppliers((items) => [newSup, ...items]);
          }}
        />
      )}

      {/* ================= MODAL DE FICHA TÉCNICA (WIKI / TDS / PROPRIEDADES) ================= */}
      {viewingFilament && (
        <MaterialDetailModal
          filament={viewingFilament}
          onClose={() => setViewingFilament(null)}
          onEdit={() => {
            const current = viewingFilament;
            setViewingFilament(null);
            setEditingFilament(current);
          }}
        />
      )}
    </div>
  );
}
