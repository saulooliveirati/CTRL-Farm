"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  Key,
  Sparkles,
  ArrowLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
} from "lucide-react";
import { useLicensing } from "@/contexts/licensing-context";
import { getRequiredPlanForRoute } from "@/lib/plan-permissions";

export function PlanFeatureGate({
  children,
  requiredFeature,
}: {
  children: React.ReactNode;
  requiredFeature?: string;
}) {
  const pathname = usePathname();
  const {
    isLicensed,
    planName,
    planCode,
    isRouteAllowed,
    hasFeature,
    status,
    message,
    refreshLicensing,
  } = useLicensing();

  const [inputKey, setInputKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Auto-polling a cada 12 segundos enquanto estiver aguardando aprovação
  useEffect(() => {
    if (isLicensed) return;

    const interval = setInterval(() => {
      refreshLicensing();
    }, 12000);

    return () => clearInterval(interval);
  }, [isLicensed, refreshLicensing]);

  // Rotas que são sempre públicas dentro do sistema (perfil e settings para ativar licença)
  if (pathname === "/settings" || pathname === "/profile") {
    return <>{children}</>;
  }

  async function handleActivateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setActivating(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/licensing/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationKey: inputKey.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Chave de ativação inválida ou não encontrada.");
      }

      setStatusMsg({
        type: "success",
        text: data.message || "Licença ativada com sucesso! Desbloqueando plataforma...",
      });

      await refreshLicensing();
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "Falha ao ativar chave. Verifique o código e tente novamente.",
      });
    } finally {
      setActivating(false);
    }
  }

  async function handleCheckApproval() {
    setCheckingApproval(true);
    setStatusMsg(null);
    try {
      await refreshLicensing();
      if (!isLicensed) {
        setStatusMsg({
          type: "error",
          text: "Seu cadastro ainda está pendente de aprovação no Sistema ADM Gerente.",
        });
      }
    } finally {
      setCheckingApproval(false);
    }
  }

  // 1. Caso NÃO esteja licenciado ou chave pendente de ativação
  if (!isLicensed) {
    return (
      <div className="flex min-h-[75vh] items-center justify-center p-4">
        <div className="w-full max-w-xl rounded-3xl border border-amber-500/30 bg-[#0c1425] p-6 sm:p-8 text-center shadow-2xl space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-950/40 text-amber-400 shadow-xl shadow-amber-950/40">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-950/50 px-3.5 py-1 text-[11px] font-bold tracking-wider text-amber-400 uppercase">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Aguardando Registro da Chave de Ativação</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Acesso Bloqueado: Ativação Obrigatória
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Seu cadastro foi realizado com sucesso e está submetido para aprovação no{" "}
              <strong className="text-white">Sistema ADM Gerente</strong>. Após a aprovação, a chave
              de ativação será enviada para o seu e-mail ou liberada automaticamente.
            </p>
          </div>

          {/* Feedback de Status */}
          {statusMsg && (
            <div
              className={`flex items-center gap-2.5 rounded-xl p-3 text-xs font-semibold text-left ${
                statusMsg.type === "success"
                  ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                  : "border border-amber-500/40 bg-amber-950/40 text-amber-300"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#00df81]" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Formulário Direto de Inserção de Chave */}
          <form
            onSubmit={handleActivateKey}
            className="rounded-2xl border border-[#1b263b] bg-[#091122] p-4 sm:p-5 text-left space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-[#00df81]" />
                <span>Inserir Chave de Ativação Recebida</span>
              </label>
              <span className="text-[10px] text-slate-500 font-mono">RSA Criptografada</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="CTRL-FARM-XXXX-XXXX-XXXX"
                className="h-11 w-full rounded-xl border border-[#233352] bg-[#0c1425] px-3.5 font-mono text-xs text-white uppercase placeholder-slate-500 outline-none transition focus:border-[#00df81]"
              />
              <button
                type="submit"
                disabled={activating || !inputKey.trim()}
                className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#00df81] px-5 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] disabled:opacity-50 shadow-md shadow-emerald-500/20 shrink-0"
              >
                {activating ? "Ativando..." : "Ativar Chave"}
              </button>
            </div>
          </form>

          {/* Ações Auxiliares: Verificar Aprovação e Perfil */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleCheckApproval}
              disabled={checkingApproval}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#233352] bg-[#091122] px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-[#00df81] transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${checkingApproval ? "animate-spin" : ""}`} />
              <span>Verificar Aprovação Automática</span>
            </button>

            <Link
              href="/settings"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#1b263b] bg-transparent px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
            >
              <span>Acessar Configurações</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Caso a rota específica não esteja inclusa no plano contratado
  const routeAllowed = isRouteAllowed(pathname);
  const featureAllowed = requiredFeature ? hasFeature(requiredFeature) : true;

  if (!routeAllowed || !featureAllowed) {
    const requiredPlan = getRequiredPlanForRoute(pathname);

    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#0c1425] p-8 text-center shadow-2xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-950/40 text-amber-400 shadow-xl shadow-amber-950/40">
            <Sparkles className="h-8 w-8" />
          </div>

          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/40 px-3 py-1 text-[11px] font-bold text-amber-400">
              <span>Seu Plano Atual:</span>
              <strong className="text-white">{planName}</strong>
            </div>
            <h2 className="mt-3 text-xl font-bold text-white">
              Recurso Não Incluso no seu Plano
            </h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              O módulo solicitado não está liberado pela sua chave de ativação atual. Este recurso
              está disponível a partir do <strong className="text-amber-300">{requiredPlan}</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-[#1b263b] bg-[#080e1c] p-4 text-xs text-slate-300 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Plano Contratado:</span>
              <span className="font-bold text-white font-mono">{planCode}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Plano Recomendado:</span>
              <span className="font-bold text-amber-400 font-mono">{requiredPlan}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#233352] bg-[#091122] px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Início</span>
            </Link>
            <Link
              href="/settings"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-amber-400"
            >
              <span>Fazer Upgrade de Plano</span>
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
