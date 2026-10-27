"use client";

import { useState, useEffect, type FormEvent } from "react";
import { X, Receipt, AlertCircle, Calendar } from "lucide-react";
import type { ConsignmentPartner } from "@/lib/server-consignments";

type SettlementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  partners: ConsignmentPartner[];
  initialPartnerId?: string;
};

export function SettlementModal({
  isOpen,
  onClose,
  onSuccess,
  partners,
  initialPartnerId,
}: SettlementModalProps) {
  const [locationId, setLocationId] = useState(initialPartnerId ?? "");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1º dia do mês
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // 7 dias a partir de hoje
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialPartnerId) {
        setLocationId(initialPartnerId);
      } else if (partners.length > 0 && !locationId) {
        setLocationId(partners[0]?.id ?? "");
      }
      setError("");
    }
  }, [isOpen, initialPartnerId, partners]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationId) {
      setError("Selecione o parceiro para o acerto financeiro.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      locationId,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      notes: notes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/consignments/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Erro ao gerar acerto financeiro.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Falha ao gerar acerto.");
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
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Novo Acerto Financeiro (Fechamento)</h2>
              <p className="text-xs text-slate-400">
                Consolida vendas do período, apura comissões retidas e gera fatura a receber
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Parceiro Comercial *
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Data Inicial do Período *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Data Final do Período *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Data de Vencimento do Acerto *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Prazo limite para o parceiro transferir os valores vendidos no período.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Observações / Instruções Bancárias
            </label>
            <textarea
              rows={2}
              placeholder="Chave PIX da Farm para transferência, detalhes do fechamento..."
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
              <Receipt className="h-4 w-4" />
              <span>{saving ? "Gerando..." : "Gerar Acerto Financeiro"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
