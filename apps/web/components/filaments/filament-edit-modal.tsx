"use client";

import { useState, useMemo, type FormEvent } from "react";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { SupplierRecord } from "@/lib/server-suppliers";
import { SupplierQuickCreate } from "@/components/suppliers/supplier-quick-create";
import { ColorPickerModal, parseColor } from "./color-picker-modal";
import { SpoolGraphic } from "./spool-graphic";
import {
  getAllMaterialBrands,
  getMaterialsByBrand,
  findMaterialDatabaseItem,
} from "@/lib/material-database";

const materials = ["PLA", "PETG", "ABS", "ASA", "TPU", "NYLON", "PC", "OTHER"] as const;
const materialLabels: Record<(typeof materials)[number], string> = {
  PLA: "PLA (Ácido Polilático)",
  PETG: "PETG (Poliéster Glicol)",
  ABS: "ABS (Acrilonitrila Butadieno)",
  ASA: "ASA (Acrilonitrila Estireno)",
  TPU: "TPU (Flexível / Poliuretano)",
  NYLON: "Nylon (Poliamida)",
  PC: "PC (Policarbonato)",
  OTHER: "Outro Composto",
};

export function FilamentEditModal({
  filament,
  suppliers,
  onClose,
  onUpdated,
  onSupplierCreated,
}: {
  filament: FilamentRecord;
  suppliers: SupplierRecord[];
  onClose: () => void;
  onUpdated: (updated: FilamentRecord) => void;
  onSupplierCreated: (supplier: SupplierRecord) => void;
}) {
  const [material, setMaterial] = useState(filament.material);
  const [brand, setBrand] = useState(filament.brand);
  const [color, setColor] = useState(filament.color);
  const [initialWeight, setInitialWeight] = useState(String(filament.initialWeightG));
  const [currentWeight, setCurrentWeight] = useState(String(filament.currentWeightG));
  const [price, setPrice] = useState(filament.price ? String(filament.price) : "");
  const [lot, setLot] = useState(filament.lot ?? "");
  const [supplierId, setSupplierId] = useState(filament.supplierId ?? "");

  const initialCatalogItem = findMaterialDatabaseItem(filament.brand, filament.material);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>(
    initialCatalogItem?.name ?? "",
  );

  const matchedCatalogItem = useMemo(
    () => findMaterialDatabaseItem(brand, material),
    [brand, material],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [colorModalOpen, setColorModalOpen] = useState(false);

  const parsed = parseColor(color);
  const currentRatio =
    Number(initialWeight) > 0 ? Number(currentWeight) / Number(initialWeight) : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!color.trim()) {
      setError("Defina a cor do filamento.");
      return;
    }
    const initW = Number(initialWeight);
    const currW = Number(currentWeight);
    if (!Number.isFinite(initW) || initW <= 0) {
      setError("O peso da bobina cheia deve ser maior que zero.");
      return;
    }
    if (!Number.isFinite(currW) || currW < 0) {
      setError("O peso atual não pode ser negativo.");
      return;
    }
    if (currW > initW) {
      setError("O peso atual restante não pode superar o peso total da bobina.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/filaments/${filament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material,
          brand: brand.trim(),
          color: color.trim(),
          initialWeightG: initW,
          currentWeightG: currW,
          price: price.trim() ? Number(price) : null,
          lot: lot.trim() || null,
          supplierId: supplierId || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Não foi possível atualizar o filamento.");
      }

      onUpdated(result.data as FilamentRecord);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar alterações.");
    } finally {
      setSaving(false);
    }
  }

  const field =
    "h-10 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-sm text-white outline-none transition focus:border-emerald-400";
  const label = "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-300";

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-150"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget && !saving) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-filament-title"
          className="my-auto max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl sm:p-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <SpoolGraphic colorHex={parsed.hex} ratio={currentRatio} size={48} />
              <div>
                <h2 id="edit-filament-title" className="text-lg font-bold text-white">
                  Editar Bobina de Filamento
                </h2>
                <p className="text-xs text-slate-400">
                  Modifique especificações, peso disponível e fornecedor do carretel.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
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

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
            {/* Fabricante / Marca com Opção Genérico em Destaque */}
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

            {/* Linha / Tipo do Material Pré-Cadastrado */}
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

            {/* Banner Informativo de Especificações Técnicas Vinculadas */}
            {matchedCatalogItem && (
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <span>🔬 Ficha Técnica Vinculada:</span>
                    <span>
                      {matchedCatalogItem.manufacturerBrand} - {matchedCatalogItem.name}
                    </span>
                  </span>
                  <span className="rounded bg-cyan-900/40 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                    {matchedCatalogItem.technology}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300 sm:grid-cols-4">
                  <div>
                    <span className="text-slate-400">Bico / Cura:</span>{" "}
                    <strong>
                      {matchedCatalogItem.printProfile.recommendedNozzleTempC > 0
                        ? `${matchedCatalogItem.printProfile.recommendedNozzleTempC}°C`
                        : `${matchedCatalogItem.printProfile.exposureTimeSec ?? "N/A"}`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Mesa:</span>{" "}
                    <strong>
                      {matchedCatalogItem.printProfile.recommendedBedTempC > 0
                        ? `${matchedCatalogItem.printProfile.recommendedBedTempC}°C`
                        : "Ambiente"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Densidade:</span>{" "}
                    <strong>{matchedCatalogItem.properties.densityGcm3 || "—"} g/cm³</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Documento:</span>{" "}
                    <strong className="text-emerald-400">
                      {matchedCatalogItem.certifications.tdsUrl ? "TDS Oficial" : "Padrão"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* Seletor de Cor Interativo */}
            <div className="sm:col-span-2">
              <span className="block text-xs font-semibold text-slate-300">Cor do Filamento *</span>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-[#070c16] p-3">
                <span
                  className="h-8 w-8 shrink-0 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: parsed.hex }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white">{parsed.name}</p>
                  <p className="font-mono text-xs text-emerald-400">{parsed.hex.toUpperCase()}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setColorModalOpen(true)}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-emerald-500 hover:text-white"
                >
                  🎨 Alterar Cor / Paleta
                </button>
              </div>
            </div>

            <label className={label}>
              Peso Total da Bobina Cheia (g) *
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
              Peso Atual Restante (g) *
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
                placeholder="0.00"
                className={field}
              />
            </label>

            <label className={label}>
              Lote / Identificador
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
                    onSupplierCreated(newSup);
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

            {/* Ações */}
            <div className="mt-2 flex items-center justify-end gap-3 sm:col-span-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/25 disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sub-modal da Paleta de Cores */}
      <ColorPickerModal
        isOpen={colorModalOpen}
        initialColor={color}
        onClose={() => setColorModalOpen(false)}
        onSelectColor={(formatted) => setColor(formatted)}
      />
    </>
  );
}
