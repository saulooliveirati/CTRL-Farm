"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Key, Sparkles, ArrowLeft, ArrowUpRight } from "lucide-react";
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
  const { isLicensed, planName, planCode, isRouteAllowed, hasFeature, setIsActivationModalOpen } =
    useLicensing();

  // Rotas que são sempre públicas dentro do sistema (perfil e settings para ativar licença)
  if (pathname === "/settings" || pathname === "/profile") {
    return <>{children}</>;
  }

  // 1. Caso NÃO esteja licenciado ou chave expirada
  if (!isLicensed) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-3xl border border-rose-500/30 bg-[#0c1425] p-8 text-center shadow-2xl space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-950/40 text-rose-400 shadow-xl shadow-rose-950/40">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div>
            <span className="rounded-full border border-rose-500/30 bg-rose-950/50 px-3 py-1 text-[11px] font-bold tracking-wider text-rose-400 uppercase">
              Bloqueio Seguro de Assinatura
            </span>
            <h2 className="mt-3 text-xl font-bold text-white">Sistema CTRL-Farm Não Ativado</h2>
            <p className="mt-2 text-xs text-slate-400 leading-relaxed">
              Para desbloquear as ferramentas de gestão, impressoras 3D, estoques e produção, insira
              sua chave de ativação RSA emitida pelo Sistema ADM Gerente.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsActivationModalOpen(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#00df81] px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-lg shadow-emerald-500/20"
            >
              <Key className="h-4 w-4" />
              <span>Inserir Chave de Ativação</span>
            </button>
            <Link
              href="/settings"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#233352] bg-[#091122] px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-500 transition"
            >
              <span>Ir para Assinatura</span>
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
              <span className="font-bold text-emerald-400 font-mono">{requiredPlan}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#233352] bg-[#091122] px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Link>
            <button
              type="button"
              onClick={() => setIsActivationModalOpen(true)}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#00df81] px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-lg shadow-emerald-500/20"
            >
              <Key className="h-4 w-4" />
              <span>Atualizar Chave / Upgrade</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Rota permitida normalmente
  return <>{children}</>;
}
