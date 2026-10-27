"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, RotateCcw, AlertTriangle, AlertCircle } from "lucide-react";
import type { ConsignmentPartner, ConsignmentStockItem } from "@/lib/server-consignments";

type ReturnModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: ConsignmentPartner[];
  initialPartnerId?: string;
  initialProductName?: string;
};

export function ReturnModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
  initialPartnerId,
  initialProductName,
}: ReturnModalProps) {
  const [locationId, setLocationId] = useState(initialPartnerId ?? "");
  const [partnerStocks, setPartnerStocks] = useState<ConsignmentStockItem[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);

  const [selectedStockId, setSelectedStockId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [returnType, setReturnType] = useState<"DEVOLUCAO" | "AVARIA" | "PERDA">("DEVOLUCAO");
  const [returnToMainStock, setReturnToMainStock] = useState(true);
  const [reason, setReason] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

        if (initialProductName) {
          const matching = list.find((s) => s.productName === initialProductName);
          if (matching) setSelectedStockId(matching.id);
          else if (list.length > 0) setSelectedStockId(list[0]?.id ?? "");
        } else if (list.length > 0) {
          setSelectedStockId(list[0]?.id ?? "");
        } else {
          setSelectedStockId("");
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
      setReturnType("DEVOLUCAO");
      setReturnToMainStock(true);
      setReason("");
      setError("");
    }
  }, [isOpen, initialPartnerId, partners]);

  const selectedStock = partnerStocks.find((s) => s.id === selectedStockId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      setError("Selecione o parceiro comercial.");
      return;
    }
    if (!selectedStock) {
      setError("Selecione o produto a devolver.");
      return;
    }
    if (quantity <= 0) {
      setError("A quantidade deve ser maior que zero.");
      return;
    }
    if (quantity > selectedStock.quantityAvailable) {
      setError(
        `Quantidade excede o disponível (${selectedStock.quantityAvailable} un).`
      );
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      locationId,
      productId: selectedStock.productId || undefined,
      productName: selectedStock.productName,
      quantity: Number(quantity),
      reason: reason.trim() || undefined,
      returnType,
      returnToMainStock: returnType === "DEVOLUCAO" ? returnToMainStock : false,
    };

    try {
      const res = await fetch("/api/consignments/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao registrar devolução.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha ao registrar devolução.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#101827]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registrar Devolução ou Avaria</h2>
              <p className="text-xs text-slate-400">
                Ajuste de saldo consignado e reintegração ao estoque central da Farm
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
              Produto no Estoque do Parceiro *
            </label>
            {loadingStocks ? (
              <div className="text-xs text-slate-400 py-2">Carregando itens...</div>
            ) : partnerStocks.length === 0 ? (
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs">
                Nenhum produto disponível em estoque neste parceiro.
              </div>
            ) : (
              <select
                required
                value={selectedStockId}
                onChange={(e) => setSelectedStockId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                {partnerStocks.map((st) => (
                  <option
                    key={st.id}
                    value={st.id}
                    disabled={st.quantityAvailable <= 0}
                  >
                    {st.productName} — Disp: {st.quantityAvailable} un
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Tipo da Ocorrência *
              </label>
              <select
                value={returnType}
                onChange={(e) => setReturnType(e.target.value as any)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="DEVOLUCAO">Devolução Comercial (Produto Intacto)</option>
                <option value="AVARIA">Avaria (Danificado / Quebrado)</option>
                <option value="PERDA">Extravio / Perda</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Quantidade *
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
          </div>

          {returnType === "DEVOLUCAO" && (
            <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-800 bg-slate-900/60 cursor-pointer">
              <input
                type="checkbox"
                checked={returnToMainStock}
                onChange={(e) => setReturnToMainStock(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <span className="text-xs text-slate-300">
                Reintegrar unidades automaticamente ao estoque físico central da Farm
              </span>
            </label>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Motivo da Devolução / Observações
            </label>
            <textarea
              rows={3}
              placeholder="Ex: Fim de temporada / Sem giro no ponto de venda..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              className="rounded-lg bg-amber-600 hover:bg-amber-500 px-5 py-2 text-sm font-bold text-white transition shadow-lg shadow-amber-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>{saving ? "Processando..." : "Confirmar Devolução"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
