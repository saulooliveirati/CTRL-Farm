"use client";

import { useState } from "react";
import type { InventoryCategory, InventoryMaterialRecord } from "@/lib/server-inventory-materials";
import type { SupplierRecord } from "@/lib/server-suppliers";

const categories: { value: InventoryCategory; label: string }[] = [
  { value: "EQUIPMENT", label: "Equipamento" }, { value: "CONSUMABLE", label: "Insumo" },
  { value: "SPARE_PART", label: "Peça / reposição" }, { value: "TOOL", label: "Ferramenta" },
  { value: "PACKAGING", label: "Embalagem" }, { value: "OTHER", label: "Outro" },
];

export function InventoryMaterialsManager({ initialMaterials, suppliers, initialError }: { initialMaterials: InventoryMaterialRecord[]; suppliers: SupplierRecord[]; initialError: string }) {
  const [materials, setMaterials] = useState(initialMaterials);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("CONSUMABLE");
  const [unit, setUnit] = useState("un");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [minimum, setMinimum] = useState("0");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState("");

  async function createMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/inventory-materials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, category, unit, currentQuantity: Number(quantity), minimumQuantity: Number(minimum), ...(sku && { sku }), ...(unitCost && { unitCost: Number(unitCost) }), ...(supplierId && { supplierId }) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar o item.");
      setMaterials((items) => [...items, result.data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setName(""); setSku(""); setQuantity("0"); setMinimum("0"); setUnitCost(""); setSupplierId("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao cadastrar item."); }
    finally { setSaving(false); }
  }

  async function saveQuantity(item: InventoryMaterialRecord) {
    const currentQuantity = Number(quantities[item.id] ?? item.currentQuantity);
    if (!Number.isFinite(currentQuantity) || currentQuantity < 0 || currentQuantity > 999999999) { setError("Informe um saldo válido."); return; }
    const response = await fetch(`/api/inventory-materials/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentQuantity }) });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível atualizar o saldo."); return; }
    setMaterials((items) => items.map((record) => record.id === item.id ? result.data : record));
    setQuantities((state) => { const next = { ...state }; delete next[item.id]; return next; }); setError("");
  }

  async function removeMaterial(item: InventoryMaterialRecord) {
    if (!window.confirm(`Remover “${item.name}” do estoque?`)) return;
    const response = await fetch(`/api/inventory-materials/${item.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível remover o item."); return; }
    setMaterials((items) => items.filter((record) => record.id !== item.id)); setError("");
  }

  return <div className="space-y-8">
    <header><h2 className="text-2xl font-bold tracking-tight">Materiais e equipamentos</h2><p className="text-muted-foreground">Controle ferramentas, peças, embalagens, insumos e equipamentos gerais com fornecedor e estoque mínimo.</p></header>
    <section className="rounded-xl border bg-background p-6 shadow-sm"><h3 className="mb-4 font-semibold">Cadastrar material ou equipamento</h3>
      <form onSubmit={createMaterial} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="grid gap-1 text-sm">Nome *<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: Álcool isopropílico" /></label>
        <label className="grid gap-1 text-sm">Categoria *<select value={category} onChange={(event) => setCategory(event.target.value as InventoryCategory)} className="rounded-md border bg-background px-3 py-2">{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Unidade *<input required maxLength={20} value={unit} onChange={(event) => setUnit(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="un, ml, kg…" /></label>
        <label className="grid gap-1 text-sm">Código / SKU<input maxLength={60} value={sku} onChange={(event) => setSku(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Saldo inicial<input required type="number" min="0" max="999999999" step="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Estoque mínimo<input type="number" min="0" max="999999999" step="0.001" value={minimum} onChange={(event) => setMinimum(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Custo por unidade (R$)<input type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Fornecedor<select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="rounded-md border bg-background px-3 py-2"><option value="">Não informado</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
        <div className="md:col-span-2 xl:col-span-4"><button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Cadastrar item"}</button></div>
      </form>
    </section>
    {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="rounded-xl border bg-background shadow-sm"><div className="flex items-center justify-between border-b p-5"><h3 className="font-semibold">Estoque geral</h3><span className="text-sm text-muted-foreground">{materials.length} itens</span></div>
      {materials.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Item</th><th className="px-5 py-3 font-medium">Categoria</th><th className="px-5 py-3 font-medium">Fornecedor</th><th className="px-5 py-3 font-medium">Saldo / mínimo</th><th className="px-5 py-3 font-medium">Custo unitário</th><th className="px-5 py-3 font-medium">Ações</th></tr></thead><tbody className="divide-y">{materials.map((item) => { const belowMinimum = Number(item.currentQuantity) <= Number(item.minimumQuantity); return <tr key={item.id}><td className="px-5 py-4 font-medium">{item.name}<div className="text-xs text-muted-foreground">{item.sku ?? "Sem SKU"}</div></td><td className="px-5 py-4">{categories.find((categoryItem) => categoryItem.value === item.category)?.label}</td><td className="px-5 py-4">{item.supplier?.name ?? "—"}</td><td className="px-5 py-4"><div className={belowMinimum ? "font-medium text-destructive" : ""}><input aria-label={`Saldo de ${item.name}`} type="number" min="0" step="0.001" value={quantities[item.id] ?? item.currentQuantity} onChange={(event) => setQuantities((state) => ({ ...state, [item.id]: event.target.value }))} className="w-28 rounded-md border bg-background px-2 py-1" /> {item.unit}{belowMinimum ? " · Repor" : ""}</div><div className="text-xs text-muted-foreground">Mínimo: {Number(item.minimumQuantity)} {item.unit}</div></td><td className="px-5 py-4">{item.unitCost ? `R$ ${Number(item.unitCost).toFixed(2)}` : "—"}</td><td className="space-x-3 px-5 py-4">{quantities[item.id] !== undefined && <button onClick={() => void saveQuantity(item)} className="text-primary hover:underline">Salvar saldo</button>}<button onClick={() => void removeMaterial(item)} className="text-destructive hover:underline">Remover</button></td></tr>; })}</tbody></table></div>}
    </section>
  </div>;
}
