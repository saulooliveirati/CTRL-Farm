"use client";

import { useState } from "react";
import { Key, X, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { useLicensing } from "@/contexts/licensing-context";

export function GlobalActivationModal() {
  const { isActivationModalOpen, setIsActivationModalOpen, refreshLicensing, activationKey: currentKey } =
    useLicensing();

  const [inputKey, setInputKey] = useState(currentKey || "");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isActivationModalOpen) return null;

  async function handleCheckApproval() {
    setChecking(true);
    setStatusMsg(null);
    try {
      await refreshLicensing();
      setStatusMsg({
        type: "success",
        text: "Verificação concluída. Status sincronizado com o servidor.",
      });
    } catch {
      setStatusMsg({
        type: "error",
        text: "Não foi possível verificar no momento.",
      });
    } finally {
      setChecking(false);
    }
  }

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/licensing/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationKey: inputKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Chave de ativação inválida ou recusada pelo servidor ADM.");
      }

      setStatusMsg({
        type: "success",
        text: data.message || "Licença ativada com sucesso!",
      });

      await refreshLicensing();
      setTimeout(() => {
        setIsActivationModalOpen(false);
      }, 2000);
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Falha ao ativar chave de licença.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-[#00df81] border border-emerald-500/40">
              <Key className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Chave de Ativação do Sistema</h3>
              <p className="text-[11px] text-slate-400">Ativação criptográfica RSA CTRL-Farm</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsActivationModalOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {statusMsg && (
          <div
            className={`flex items-center gap-2 rounded-xl p-3 text-xs font-semibold ${
              statusMsg.type === "success"
                ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : "border border-rose-500/40 bg-rose-950/40 text-rose-300"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleActivate} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Chave de Licença Fornecida
            </label>
            <input
              type="text"
              required
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value.toUpperCase())}
              placeholder="CTRL-FARM-XXXX-XXXX-XXXX"
              className="h-11 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3.5 font-mono text-xs font-bold tracking-wider text-emerald-400 placeholder-slate-600 outline-none transition focus:border-[#00df81]"
            />
            <p className="text-[10px] text-slate-400">
              O plano e os módulos disponíveis serão ajustados automaticamente conforme a chave inserida.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#1b263b]">
            <button
              type="button"
              onClick={handleCheckApproval}
              disabled={checking}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-[#00df81] transition"
            >
              <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
              <span>Verificar Aprovação Automática</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsActivationModalOpen(false)}
                className="rounded-xl border border-[#233352] px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-[#00df81] px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                <span>{loading ? "Validando RSA..." : "Ativar Licença"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
