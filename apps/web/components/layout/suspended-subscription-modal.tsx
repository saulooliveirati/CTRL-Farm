"use client";

import { useState } from "react";
import { ShieldAlert, RefreshCw, Key, CheckCircle2, AlertCircle } from "lucide-react";
import { useLicensing } from "@/contexts/licensing-context";

export function SuspendedSubscriptionModal() {
  const { isSuspended, status, verifyPayment, setIsActivationModalOpen } = useLicensing();
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  if (!isSuspended) return null;

  const isPaused = status === "PAUSED" || status === "PAUSADO";
  const isCancelled = status === "CANCELLED" || status === "CANCELADO";

  const modalTitle = isPaused
    ? "Licença Pausada"
    : isCancelled
      ? "Assinatura Cancelada"
      : "Assinatura Suspensa";

  const badgeText = isPaused
    ? "Licença Pausada no Sistema ADM"
    : isCancelled
      ? "Assinatura Cancelada"
      : "Acesso Temporariamente Travado";

  async function handleCheckPayment() {
    setChecking(true);
    setFeedback(null);
    try {
      const isPaid = await verifyPayment();
      if (isPaid) {
        setFeedback({
          type: "success",
          message: "Pagamento confirmado com sucesso! Reativando sistema...",
        });
      } else {
        setFeedback({
          type: "error",
          message: "Pagamento ainda pendente de confirmação. Aguarde alguns instantes ou tente novamente.",
        });
      }
    } catch {
      setFeedback({
        type: "error",
        message: "Não foi possível validar o pagamento com o servidor no momento.",
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-lg rounded-3xl border border-rose-500/40 bg-[#0c1425] p-7 sm:p-8 shadow-2xl shadow-rose-950/50 space-y-5 text-slate-200">
        {/* Topo com Ícone de Alerta */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/50 bg-rose-950/40 text-rose-400 shadow-xl shadow-rose-950/50">
            <ShieldAlert className="h-8 w-8 text-rose-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-950/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
            <span>{badgeText}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {modalTitle}
          </h2>
        </div>

        {/* Feedback de Validação */}
        {feedback && (
          <div
            className={`flex items-center gap-2.5 rounded-xl p-3.5 text-xs font-semibold ${
              feedback.type === "success"
                ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : "border border-rose-500/40 bg-rose-950/40 text-rose-300"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Mensagem Exata Solicitada */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#080e1c] p-5 text-xs text-slate-300 leading-relaxed space-y-3">
          <p>
            Identificamos que sua assinatura do <strong className="text-white">CTRL+Farm</strong> encontra-se com pagamento pendente. Por esse motivo, o acesso ao sistema foi temporariamente suspenso.
          </p>

          <p>
            Para restabelecer todos os recursos, basta regularizar o pagamento da sua assinatura. Assim que a confirmação for processada, o acesso será reativado automaticamente.
          </p>

          <p className="text-slate-400">
            Se o pagamento já foi realizado recentemente, aguarde alguns instantes e tente acessar novamente. Caso o problema persista, entre em contato com nossa equipe de suporte.
          </p>

          <p className="font-bold text-white pt-1 border-t border-slate-800">
            Agradecemos pela compreensão e esperamos tê-lo de volta em breve!
          </p>
        </div>

        {/* Ações para Desbloqueio */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsActivationModalOpen(true)}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#233352] bg-[#091122] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition"
          >
            <Key className="h-3.5 w-3.5" />
            <span>Inserir Nova Chave</span>
          </button>

          <button
            type="button"
            disabled={checking}
            onClick={handleCheckPayment}
            className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#00df81] px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin text-slate-950" : ""}`} />
            <span>{checking ? "Sincronizando com ADM..." : "Verificar / Sincronizar Agora"}</span>
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-500">
          Validação automática em segundo plano a cada 15 minutos para liberação imediata.
        </p>
      </div>
    </div>
  );
}
