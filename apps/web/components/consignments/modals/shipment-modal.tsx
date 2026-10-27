"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, Truck, Plus, Trash2, Package, Calculator, AlertCircle } from "lucide-react";
import type { ConsignmentPartner } from "@/lib/server-consignments";
import type { ProductRecord } from "@/lib/server-products";

type ShipmentItemRow = {
  productId?: string;
  productName: string;
  sku?: string;
  quantity: number;
  costPrice: number;
  suggestedPrice: number;
  salePrice: number;
  minPrice: number;
  commissionRate: number;
  commissionFixed?: number;
  notes?: string;
};

type ShipmentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: ConsignmentPartner[];
  productsCatalog?: ProductRecord[];
};

export function ShipmentModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
  productsCatalog = [],
}: ShipmentModalProps) {
  const [locationId, setLocationId] = useState("");
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ShipmentItemRow[]>([
    {
      productName: "",
      quantity: 1,
      costPrice: 0,
      suggestedPrice: 0,
      salePrice: 0,
      minPrice: 0,
      commissionRate: 20,
      notes: "",
    },
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (partners.length > 0 && !locationId) {
        setLocationId(partners[0]?.id ?? "");
      }
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const year = new Date().getFullYear();
      setCode(`ENV-${year}-${randomSuffix}`);
      setSentAt(new Date().toISOString().slice(0, 10));
      setNotes("");
      setItems([
        {
          productName: "",
          quantity: 1,
          costPrice: 0,
          suggestedPrice: 0,
          salePrice: 0,
          minPrice: 0,
          commissionRate: 20,
          notes: "",
        },
      ]);
      setError("");
    }
  }, [isOpen, partners]);

  // Quando o parceiro muda, atualiza taxa de comissão padrão para os itens novos
  const selectedPartner = partners.find((p) => p.id === locationId);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productName: "",
        quantity: 1,
        costPrice: 0,
        suggestedPrice: 0,
        salePrice: 0,
        minPrice: 0,
        commissionRate: selectedPartner ? Number(selectedPartner.defaultCommissionRate) || 20 : 20,
        notes: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ShipmentItemRow, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      const row = { ...updated[index]!, [field]: value };

      // Se selecionou produto existente do catálogo
      if (field === "productId" && value) {
        const prod = productsCatalog.find((p) => p.id === value);
        if (prod) {
          row.productName = prod.name;
          row.sku = prod.sku ?? "";
          row.costPrice = Number(prod.costPrice) || 0;
          row.suggestedPrice = Number(prod.sellingPrice) || 0;
          row.salePrice = Number(prod.sellingPrice) || 0;
          row.minPrice = Number(prod.sellingPrice) * 0.9;
        }
      }

      updated[index] = row;
      return updated;
    });
  };

  // Totais
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalCost = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.costPrice) || 0),
    0
  );
  const totalSaleValue = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.salePrice) || 0),
    0
  );
  const projectedProfit = totalSaleValue - totalCost;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      setError("Selecione o parceiro comercial destinatário.");
      return;
    }
    if (items.length === 0) {
      setError("Adicione ao menos um item ao documento de envio.");
      return;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i]!;
      if (!it.productName.trim()) {
        setError(`O item #${i + 1} precisa ter um nome ou produto selecionado.`);
        return;
      }
      if (!it.quantity || it.quantity <= 0) {
        setError(`A quantidade do item #${i + 1} deve ser maior que zero.`);
        return;
      }
      if (it.salePrice < 0) {
        setError(`O preço de venda do item #${i + 1} não pode ser negativo.`);
        return;
      }
    }

    setSaving(true);
    setError("");

    const payload = {
      locationId,
      code: code.trim(),
      sentAt: sentAt ? new Date(sentAt).toISOString() : new Date().toISOString(),
      notes: notes.trim() || undefined,
      items: items.map((it) => ({
        productId: it.productId || undefined,
        productName: it.productName.trim(),
        sku: it.sku?.trim() || undefined,
        quantity: Number(it.quantity),
        costPrice: Number(it.costPrice) || 0,
        suggestedPrice: Number(it.suggestedPrice) || Number(it.salePrice) || 0,
        salePrice: Number(it.salePrice) || 0,
        minPrice: it.minPrice ? Number(it.minPrice) : undefined,
        commissionRate: it.commissionRate ? Number(it.commissionRate) : undefined,
        commissionFixed: it.commissionFixed ? Number(it.commissionFixed) : undefined,
        notes: it.notes?.trim() || undefined,
      })),
    };

    try {
      const res = await fetch("/api/consignments/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao criar envio de consignação.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha ao registrar envio.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl my-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#101827]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Novo Documento de Envio (Remessa)</h2>
              <p className="text-xs text-slate-400">
                Gera o lote de consignação, movimenta estoque e define preços e comissões acordadas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados do Documento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Parceiro Destinatário *
              </label>
              <select
                required
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="">Selecione um parceiro...</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.city} - {p.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Número do Documento / Remessa *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Data do Envio *
              </label>
              <input
                type="date"
                required
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Itens do Envio */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Package className="h-4 w-4" /> Produtos Enviados ({items.length})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 px-3 py-1 text-xs font-semibold text-cyan-300 transition flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Adicionar Produto</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-800 bg-[#0e1626] space-y-3 relative group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-800/60">
                    <span className="font-semibold text-white">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-red-400 hover:text-red-300 transition flex items-center gap-1 text-[11px]"
                      >
                        <Trash2 className="h-3 w-3" /> Remover
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
                    {/* Seleção de Catálogo */}
                    {productsCatalog.length > 0 && (
                      <div className="md:col-span-2">
                        <label className="block text-[11px] text-slate-400 mb-1">
                          Produto do Catálogo CTRL-Farm
                        </label>
                        <select
                          value={item.productId || ""}
                          onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                          className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="">Digitação manual / Personalizado</option>
                          {productsCatalog.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.sku ? `(${p.sku})` : ""} - R$ {p.sellingPrice.toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Nome do Produto */}
                    <div className={productsCatalog.length > 0 ? "md:col-span-2" : "md:col-span-3"}>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Nome do Produto *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Suporte Articulado Geek"
                        value={item.productName}
                        onChange={(e) => handleItemChange(idx, "productName", e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* SKU */}
                    <div className="md:col-span-1">
                      <label className="block text-[11px] text-slate-400 mb-1">SKU / Cód.</label>
                      <input
                        type="text"
                        placeholder="SUP-01"
                        value={item.sku ?? ""}
                        onChange={(e) => handleItemChange(idx, "sku", e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Quantidade */}
                    <div className="md:col-span-1">
                      <label className="block text-[11px] text-slate-400 mb-1">Qtd Envio *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white font-bold text-center focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Valor de Custo */}
                    <div className="md:col-span-1">
                      <label className="block text-[11px] text-slate-400 mb-1">Custo (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.costPrice}
                        onChange={(e) => handleItemChange(idx, "costPrice", Number(e.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Preço de Venda */}
                    <div className="md:col-span-1">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Preço Venda (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.salePrice}
                        onChange={(e) => handleItemChange(idx, "salePrice", Number(e.target.value))}
                        className="w-full rounded border border-emerald-500/40 bg-slate-900 px-2.5 py-1.5 text-emerald-400 font-bold focus:border-emerald-400 focus:outline-none"
                      />
                    </div>

                    {/* Preço Mínimo */}
                    <div className="md:col-span-1">
                      <label className="block text-[11px] text-slate-400 mb-1">Preço Mínimo</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="R$ 0,00"
                        value={item.minPrice || ""}
                        onChange={(e) => handleItemChange(idx, "minPrice", Number(e.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Comissão % */}
                    <div className="md:col-span-1">
                      <label className="block text-[11px] text-slate-400 mb-1">Comissão (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={item.commissionRate}
                        onChange={(e) => handleItemChange(idx, "commissionRate", Number(e.target.value))}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-cyan-300 font-bold focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Observação Item */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Obs / Variação (Cor, Acabamento)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Cor Preta / Com suporte"
                        value={item.notes ?? ""}
                        onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                        className="w-full rounded border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sumário / Prévia Financeira */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0e1628] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-cyan-400 font-bold">
              <Calculator className="h-4 w-4" />
              <span>Totais do Envio</span>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <div>
                <span className="text-slate-400 block text-[10px]">Total Unidades:</span>
                <span className="text-white font-bold text-sm">{totalQuantity} itens</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Custo Total:</span>
                <span className="text-slate-300 font-bold text-sm">
                  R$ {totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Valor Total de Venda:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  R$ {totalSaleValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Projeção de Lucro Farm:</span>
                <span className="text-cyan-300 font-bold text-sm">
                  R$ {projectedProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Observações da Remessa */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Observações do Documento / Condições
            </label>
            <textarea
              rows={2}
              placeholder="Instruções de conferência, prazo de acerto acordado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-5 py-2 text-sm font-bold text-white transition shadow-lg shadow-cyan-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Truck className="h-4 w-4" />
              <span>{saving ? "Emitindo Envio..." : "Emitir Documento de Envio"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
