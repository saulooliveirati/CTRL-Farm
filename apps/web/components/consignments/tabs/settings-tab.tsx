"use client";

import { useState, useEffect, type FormEvent } from "react";
import { Settings, Save, Sparkles, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";

export function SettingsTab() {
  const [defaultCommissionType, setDefaultCommissionType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [defaultCommissionRate, setDefaultCommissionRate] = useState<number>(20);
  const [stagnantDaysAlert, setStagnantDaysAlert] = useState<number>(15);
  const [lowStockAlertThreshold, setLowStockAlertThreshold] = useState<number>(2);
  const [settlementDueDays, setSettlementDueDays] = useState<number>(7);
  const [receiptTerms, setReceiptTerms] = useState<string>(
    "Os produtos descritos neste romaneio são entregues sob regime de consignação mercantil. A propriedade dos bens permanece com a consignante até a sua efetiva venda ou devolução."
  );

  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    // Carrega do localStorage se houver
    try {
      const stored = localStorage.getItem("ctrlfarm_consignments_config");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.defaultCommissionType) setDefaultCommissionType(parsed.defaultCommissionType);
        if (parsed.defaultCommissionRate !== undefined) setDefaultCommissionRate(parsed.defaultCommissionRate);
        if (parsed.stagnantDaysAlert !== undefined) setStagnantDaysAlert(parsed.stagnantDaysAlert);
        if (parsed.lowStockAlertThreshold !== undefined) setLowStockAlertThreshold(parsed.lowStockAlertThreshold);
        if (parsed.settlementDueDays !== undefined) setSettlementDueDays(parsed.settlementDueDays);
        if (parsed.receiptTerms) setReceiptTerms(parsed.receiptTerms);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const config = {
      defaultCommissionType,
      defaultCommissionRate,
      stagnantDaysAlert,
      lowStockAlertThreshold,
      settlementDueDays,
      receiptTerms,
    };
    try {
      localStorage.setItem("ctrlfarm_consignments_config", JSON.stringify(config));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="p-6 rounded-2xl border border-slate-800 bg-[#101827] shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Parâmetros de Gestão de Consignados</h2>
              <p className="text-xs text-slate-400">
                Regras padrão de comissionamento, alertas inteligentes e termos de romaneio
              </p>
            </div>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4" />
              <span>Configurações salvas com sucesso!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-6 text-xs">
          {/* Comissões Padrão */}
          <div className="space-y-4">
            <h3 className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Regra Padrão para Novos Parceiros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Modelo de Comissão Pré-Definido
                </label>
                <select
                  value={defaultCommissionType}
                  onChange={(e) => setDefaultCommissionType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="PERCENTAGE">Percentual (%) sobre o valor de venda</option>
                  <option value="FIXED">Valor Fixo (R$) por unidade vendida</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Taxa Sugerida (
                  {defaultCommissionType === "PERCENTAGE" ? "% percentual" : "R$ valor fixo"})
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={defaultCommissionRate}
                    onChange={(e) => setDefaultCommissionRate(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white font-bold focus:border-cyan-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2 font-bold text-slate-400">
                    {defaultCommissionType === "PERCENTAGE" ? "%" : "R$"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gatilhos de Alerta Inteligente */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Gatilhos de Alerta Inteligente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Alerta de Produto Sem Movimento (Dias)
                </label>
                <input
                  type="number"
                  min="1"
                  value={stagnantDaysAlert}
                  onChange={(e) => setStagnantDaysAlert(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Dispara alerta se o produto ficar mais de {stagnantDaysAlert} dias sem vendas
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Limite de Estoque Baixo (Unidades)
                </label>
                <input
                  type="number"
                  min="1"
                  value={lowStockAlertThreshold}
                  onChange={(e) => setLowStockAlertThreshold(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Avisa quando o estoque no parceiro chegar a {lowStockAlertThreshold} un ou menos
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Prazo de Vencimento de Acertos (Dias)
                </label>
                <input
                  type="number"
                  min="1"
                  value={settlementDueDays}
                  onChange={(e) => setSettlementDueDays(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Prazo sugerido após fechamento da fatura
                </span>
              </div>
            </div>
          </div>

          {/* Termos Legais do Romaneio */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Termos de Responsabilidade no Documento de Envio
            </h3>
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Cláusula Padrão Impressa no Romaneio de Entrega
              </label>
              <textarea
                rows={4}
                value={receiptTerms}
                onChange={(e) => setReceiptTerms(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white leading-relaxed focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Texto que aparecerá ao final da impressão das remessas para assinatura do responsável do estabelecimento.
              </span>
            </div>
          </div>

          {/* Salvar */}
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-6 py-2.5 text-xs font-bold text-white transition flex items-center gap-2 shadow-lg shadow-cyan-600/20"
            >
              <Save className="h-4 w-4" />
              <span>Salvar Parâmetros</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
