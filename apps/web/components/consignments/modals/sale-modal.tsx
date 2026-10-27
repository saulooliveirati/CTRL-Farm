"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, ShoppingCart, AlertCircle, Calculator } from "lucide-react";
import type { ConsignmentPartner, ConsignmentStockItem } from "@/lib/server-consignments";

type SaleModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: ConsignmentPartner[];
  initialPartnerId?: string;
  initialProductName?: string;
};

export function SaleModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
  initialPartnerId,
  initialProductName,
}: SaleModalProps) {
  const [locationId, setLocationId] = useState(initialPartnerId ?? "");
  const [partnerStocks, setPartnerStocks] = useState<ConsignmentStockItem[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);

  const [selectedStockId, setSelectedStockId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [soldAt, setSoldAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Carrega o estoque do parceiro selecionado
  useEffect(() => {
    if (!locationId || !isOpen) return;

    let isMounted = true;
    setLoadingStocks(true);
    fetch(`/api/consignments/stocks?locationId=${locationId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        const list: ConsignmentStockItem[] = data.data ?? data ?? [];
        setPartnerStocks(list);

        // Se veio initialProductName, tenta selecionar
        if (initialProductName) {
          const matching = list.find((s) => s.productName === initialProductName);
          if (matching) {
            setSelectedStockId(matching.id);
            setUnitPrice(Number(matching.sellingPrice) || 0);
          } else if (list.length > 0) {
            setSelectedStockId(list[0]?.id ?? "");
            setUnitPrice(Number(list[0]?.sellingPrice) || 0);
          }
        } else if (list.length > 0) {
          setSelectedStockId(list[0]?.id ?? "");
          setUnitPrice(Number(list[0]?.sellingPrice) || 0);
        } else {
          setSelectedStockId("");
          setUnitPrice(0);
        }
      })
      .catch(() => {
        if (isMounted) setPartnerStocks([]);
      })
      .finally(() => {
        if (isMounted) setLoadingStocks(false);
      });

    return () => {
      isMounted = false;
    };
  }, [locationId, isOpen, initialProductName]);

  useEffect(() => {
    if (isOpen) {
      if (initialPartnerId) {
        setLocationId(initialPartnerId);
      } else if (partners.length > 0 && !locationId) {
        setLocationId(partners[0]?.id ?? "");
      }
      setQuantity(1);
      setDiscount(0);
      setSoldAt(new Date().toISOString().slice(0, 10));
      setNotes("");
      setError("");
    }
  }, [isOpen, initialPartnerId, partners]);

  const selectedStock = partnerStocks.find((s) => s.id === selectedStockId);
  const selectedPartner = partners.find((p) => p.id === locationId);

  const handleStockChange = (stockId: string) => {
    setSelectedStockId(stockId);
    const stock = partnerStocks.find((s) => s.id === stockId);
    if (stock) {
      setUnitPrice(Number(stock.sellingPrice) || 0);
    }
  };

  // Cálculos em tempo real
  const grossAmount = (Number(quantity) || 0) * (Number(unitPrice) || 0);
  const netAmount = Math.max(0, grossAmount - (Number(discount) || 0));

  let commissionAmount = 0;
  if (selectedPartner) {
    if (selectedPartner.defaultCommissionType === "FIXED") {
      commissionAmount = (Number(selectedPartner.defaultCommissionRate) || 0) * (Number(quantity) || 0);
    } else {
      const rate = Number(selectedPartner.defaultCommissionRate) || 20;
      commissionAmount = (netAmount * rate) / 100;
    }
  }
  const farmRevenue = Math.max(0, netAmount - commissionAmount);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      setError("Selecione o parceiro comercial.");
      return;
    }
    if (!selectedStock) {
      setError("Selecione o produto vendido.");
      return;
    }
    if (quantity <= 0) {
      setError("A quantidade deve ser maior que zero.");
      return;
    }
    if (quantity > selectedStock.quantityAvailable) {
      setError(
        `Quantidade indisponível. O estoque atual deste parceiro possui apenas ${selectedStock.quantityAvailable} unidade(s).`
      );
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      locationId,
      productId: selectedStock.productId || undefined,
      productName: selectedStock.productName,
      sku: selectedStock.sku || undefined,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      discount: Number(discount) || 0,
      soldAt: soldAt ? new Date(soldAt).toISOString() : new Date().toISOString(),
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/consignments/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao registrar venda.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha ao registrar venda.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#101827]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registrar Venda de Consignado</h2>
              <p className="text-xs text-slate-400">
                Baixa automática de estoque, lançamento financeiro e cálculo da comissão
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Parceiro (Ponto de Venda) *
            </label>
            <select
              required
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="">Selecione o parceiro...</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.city} - {p.state})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Produto Vendido (Estoque do Parceiro) *
            </label>
            {loadingStocks ? (
              <div className="text-xs text-slate-400 py-2">Carregando estoque do parceiro...</div>
            ) : partnerStocks.length === 0 ? (
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
                Este parceiro não possui nenhum produto com estoque disponível no momento.
              </div>
            ) : (
              <select
                required
                value={selectedStockId}
                onChange={(e) => handleStockChange(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                {partnerStocks.map((st) => (
                  <option
                    key={st.id}
                    value={st.id}
                    disabled={st.quantityAvailable <= 0}
                  >
                    {st.productName} — Disp: {st.quantityAvailable} un (R$ {Number(st.sellingPrice).toFixed(2)})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedStock && (
            <div className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/60">
              <span className="text-slate-400">Saldo em estoque no parceiro:</span>
              <span className="font-bold text-cyan-300">
                {selectedStock.quantityAvailable} unidade(s) disponível(is)
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quantidade Vendida *
              </label>
              <input
                type="number"
                min="1"
                max={selectedStock ? selectedStock.quantityAvailable : 9999}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white font-bold focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Preço Unitário Praticado (R$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-emerald-400 font-bold focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Desconto Concedido (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Data da Venda *</label>
              <input
                type="date"
                required
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Resumo da Venda */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0e1628] space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
              <Calculator className="h-4 w-4" />
              <span>Simulação Financeira da Venda</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Valor Bruto:</span>
              <span className="font-semibold">
                R$ {grossAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Desconto:</span>
              <span className="text-red-400 font-semibold">
                - R$ {Number(discount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>
                Comissão do Parceiro (
                {selectedPartner?.defaultCommissionType === "FIXED"
                  ? `R$ ${selectedPartner.defaultCommissionRate}/un`
                  : `${selectedPartner?.defaultCommissionRate || 20}%`}
                ):
              </span>
              <span className="text-amber-400 font-semibold">
                R$ {commissionAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
              <span className="text-white">Valor a Receber (CTRL-Farm):</span>
              <span className="text-emerald-400">
                R$ {farmRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Observações / Identificação do Cliente
            </label>
            <input
              type="text"
              placeholder="Ex: Venda balcão / Cliente pagou no PIX"
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
              disabled={saving || !selectedStock || selectedStock.quantityAvailable <= 0}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-bold text-white transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              <span>{saving ? "Registrando..." : "Confirmar Venda"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
