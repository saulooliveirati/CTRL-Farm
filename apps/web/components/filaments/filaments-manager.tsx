"use client";

import { useState } from "react";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { SupplierRecord } from "@/lib/server-suppliers";

const materials = ["PLA", "PETG", "ABS", "ASA", "TPU", "NYLON", "PC", "OTHER"] as const;
const materialLabels: Record<(typeof materials)[number], string> = {
  PLA: "PLA", PETG: "PETG", ABS: "ABS", ASA: "ASA", TPU: "TPU", NYLON: "Nylon", PC: "PC", OTHER: "Outro",
};
const weightFormatter = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function FilamentsManager({ initialFilaments, initialSuppliers, initialError }: { initialFilaments: FilamentRecord[]; initialSuppliers: SupplierRecord[]; initialError: string }) {
  const [filaments, setFilaments] = useState(initialFilaments);
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [material, setMaterial] = useState<(typeof materials)[number]>("PLA");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [initialWeight, setInitialWeight] = useState("1000");
  const [currentWeight, setCurrentWeight] = useState("1000");
  const [price, setPrice] = useState("");
  const [lot, setLot] = useState("");
  const [supplierId, setSupplierId] = useState("");

  async function createFilament(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Number(currentWeight) > Number(initialWeight)) { setError("O peso atual não pode superar o peso inicial."); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/filaments", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ material, brand, color, initialWeightG: Number(initialWeight), currentWeightG: Number(currentWeight), ...(price && { price: Number(price) }), ...(lot && { lot }), ...(supplierId && { supplierId }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar o filamento.");
      setFilaments((items) => [result.data, ...items]);
      setBrand(""); setColor(""); setPrice(""); setLot(""); setInitialWeight("1000"); setCurrentWeight("1000"); setSupplierId("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao cadastrar."); }
    finally { setSaving(false); }
  }

  async function saveWeight(filament: FilamentRecord) {
    const grams = Number(weights[filament.id] ?? filament.currentWeightG);
    if (!Number.isInteger(grams) || grams < 0 || grams > filament.initialWeightG) { setError("Informe um peso válido, entre zero e o peso inicial."); return; }
    const response = await fetch(`/api/filaments/${filament.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentWeightG: grams }) });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível atualizar o peso."); return; }
    setFilaments((items) => items.map((item) => item.id === filament.id ? result.data : item));
    setWeights((items) => { const next = { ...items }; delete next[filament.id]; return next; });
    setError("");
  }

  async function removeFilament(filament: FilamentRecord) {
    if (!window.confirm(`Remover a bobina ${filament.material} ${filament.brand} ${filament.color}?`)) return;
    const response = await fetch(`/api/filaments/${filament.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível remover a bobina."); return; }
    setFilaments((items) => items.filter((item) => item.id !== filament.id));
  }

  const totalWeightKg = filaments.reduce((total, item) => total + item.currentWeightG, 0) / 1000;

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">Filamentos</h2>
        <p className="text-muted-foreground">Controle suas bobinas e o material disponível para produção.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-background p-5 shadow-sm"><div className="text-sm text-muted-foreground">Bobinas cadastradas</div><div className="mt-2 text-3xl font-bold">{filaments.length}</div></div>
        <div className="rounded-xl border bg-background p-5 shadow-sm"><div className="text-sm text-muted-foreground">Peso disponível</div><div className="mt-2 text-3xl font-bold">{weightFormatter.format(totalWeightKg)} kg</div></div>
      </section>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Cadastrar bobina</h3>
        <form onSubmit={createFilament} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm">Material *<select value={material} onChange={(event) => setMaterial(event.target.value as (typeof materials)[number])} className="rounded-md border bg-background px-3 py-2">{materials.map((item) => <option key={item} value={item}>{materialLabels[item]}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Marca *<input required maxLength={80} value={brand} onChange={(event) => setBrand(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: Voolt3D" /></label>
          <label className="grid gap-1 text-sm">Cor *<input required maxLength={60} value={color} onChange={(event) => setColor(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: Preto" /></label>
          <label className="grid gap-1 text-sm">Peso inicial (g) *<input required type="number" min="1" step="1" value={initialWeight} onChange={(event) => setInitialWeight(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Peso atual (g) *<input required type="number" min="0" step="1" value={currentWeight} onChange={(event) => setCurrentWeight(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Preço (R$)<input type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Opcional" /></label>
          <label className="grid gap-1 text-sm">Lote<input maxLength={100} value={lot} onChange={(event) => setLot(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Opcional" /></label>
          <label className="grid gap-1 text-sm">Fornecedor<select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="rounded-md border bg-background px-3 py-2"><option value="">Não informado</option>{initialSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <div className="flex items-end"><button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Adicionar bobina"}</button></div>
        </form>
      </section>

      {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b p-5"><h3 className="font-semibold">Estoque de filamentos</h3><span className="text-sm text-muted-foreground">{filaments.length} {filaments.length === 1 ? "bobina" : "bobinas"}</span></div>
        {filaments.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma bobina cadastrada.</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Filamento</th><th className="px-5 py-3 font-medium">Fornecedor</th><th className="px-5 py-3 font-medium">Peso inicial</th><th className="px-5 py-3 font-medium">Disponível</th><th className="px-5 py-3 font-medium">Preço</th><th className="px-5 py-3 font-medium">Ações</th></tr></thead>
            <tbody className="divide-y">{filaments.map((item) => <tr key={item.id}><td className="px-5 py-4"><div className="font-medium">{item.material} · {item.brand}</div><div className="text-xs text-muted-foreground">{item.color}{item.lot ? ` · Lote ${item.lot}` : ""}</div></td><td className="px-5 py-4">{item.supplier?.name ?? "—"}</td><td className="px-5 py-4">{weightFormatter.format(item.initialWeightG)} g</td><td className="px-5 py-4"><div className="flex items-center gap-2"><input aria-label={`Peso disponível de ${item.brand} ${item.color}`} type="number" min="0" max={item.initialWeightG} step="1" value={weights[item.id] ?? item.currentWeightG} onChange={(event) => setWeights((state) => ({ ...state, [item.id]: event.target.value }))} className="w-24 rounded-md border bg-background px-2 py-1" /><span>g</span>{weights[item.id] !== undefined && <button onClick={() => void saveWeight(item)} className="text-primary hover:underline">Salvar</button>}</div></td><td className="px-5 py-4">{item.price ? currencyFormatter.format(Number(item.price)) : "—"}</td><td className="px-5 py-4"><button onClick={() => void removeFilament(item)} className="text-destructive hover:underline">Remover</button></td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
