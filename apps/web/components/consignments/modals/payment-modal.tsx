"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import type { ConsignmentSettlement } from "@/lib/server-consignments";

type PaymentModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  settlement: ConsignmentSettlement | null;
};

export function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  settlement,
}: PaymentModalProps) {
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<"PIX" | "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "BANK_TRANSFER">("PIX");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [transactionReference, setTransactionReference] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (settlement && isOpen) {
      setAmount(Number(settlement.balanceDue) || 0);
      setMethod("PIX");
      setPaidAt(new Date().toISOString().slice(0, 10));
      setTransactionReference("");
      setNotes("");
      setError("");
    }
  }, [settlement, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settlement) return;
    if (amount <= 0) {
      setError("O valor do pagamento deve ser maior que zero.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      settlementId: settlement.id,
      amount: Number(amount),
      method,
      paidAt: paidAt ? new Date(paidAt).toISOString() : new Date().toISOString(),
      transactionReference: transactionReference.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/consignments/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao registrar pagamento.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha ao registrar pagamento.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !settlement) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-[#0c121e] text-slate-100 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-[#101827]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Registrar Pagamento</h2>
              <p className="text-xs text-slate-400">
                Baixa de conta a receber do acerto financeiro
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

        {/* Info Card */}
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-400">Acerto Nº:</span>
            <span className="font-mono font-bold text-cyan-300">{settlement.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Parceiro:</span>
            <span className="font-semibold text-white">{settlement.location.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Saldo Restante a Pagar:</span>
            <span className="font-bold text-emerald-400 text-sm">
              R$ {Number(settlement.balanceDue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Valor do Pagamento Recebido (R$) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={Number(settlement.balanceDue) * 1.5}
              required
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full rounded-lg border border-emerald-500/40 bg-slate-900/80 px-3 py-2 text-base font-bold text-emerald-400 focus:border-emerald-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Forma de Pagamento *
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="PIX">PIX (Instantâneo)</option>
              <option value="CASH">Dinheiro em Espécie</option>
              <option value="BANK_TRANSFER">Transferência Bancária / TED</option>
              <option value="CREDIT_CARD">Cartão de Crédito</option>
              <option value="DEBIT_CARD">Cartão de Débito</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Data do Pagamento *
            </label>
            <input
              type="date"
              required
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Código / Comprovante da Transação
            </label>
            <input
              type="text"
              placeholder="Ex: ID EndToEnd PIX ou Autenticação bancária"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Observações
            </label>
            <input
              type="text"
              placeholder="Ex: Pagamento parcial / Quitação total"
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
              disabled={saving || amount <= 0}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-bold text-white transition shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{saving ? "Salvando..." : "Confirmar Recebimento"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
