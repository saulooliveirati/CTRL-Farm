"use client";

import {
  Users,
  DollarSign,
  Package,
  Clock,
  Sparkles,
  Wifi,
  Key,
  ShieldAlert,
  ArrowUpRight,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function DashboardView({
  metrics,
  onNavigate,
  onOpenGenerateModal,
}: {
  metrics: any;
  onNavigate: (tab: string) => void;
  onOpenGenerateModal: () => void;
}) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const kpis = metrics?.kpis || {
    activeClients: 0,
    totalClients: 0,
    monthlyRecurringRevenue: 0,
    plansSold: 0,
    expiringLicensesCount: 0,
    latestVersion: "v2.5.0",
    connectedUsersCount: 0,
  };

  const distribution = metrics?.plansDistribution || {};
  const recentLicenses = metrics?.recentLicenses || [];
  const recentSubscriptions = metrics?.recentSubscriptions || [];
  const recentAuditLogs = metrics?.recentAuditLogs || [];

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  return (
    <div className="space-y-6">
      {/* Top Banner de Ações Rápidas */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-[#0c1425] to-[#0c1425] p-5 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xl">👑</span>
            <h2 className="text-base font-bold text-white">
              Painel Geral de Controle Comercial & Licenças
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Gerencie clientes, emita licenças criptografadas RSA 4096-bit e controle faturamento recorrente.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onOpenGenerateModal}
            className="flex items-center gap-2 rounded-xl bg-[#00df81] px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-lg shadow-emerald-500/20"
          >
            <Key className="h-4 w-4" />
            <span>Gerar Nova Licença RSA</span>
          </button>
        </div>
      </div>

      {/* Grid com 6 Cards de KPI */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {/* KPI 1: Clientes Ativos */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Clientes Ativos</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-bold text-white tracking-tight">
              {kpis.activeClients}
            </strong>
            <span className="text-[10px] text-slate-500 block">Total: {kpis.totalClients} cadastrados</span>
          </div>
        </div>

        {/* KPI 2: MRR (Receita Recorrente) */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Receita Mensal (MRR)</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-bold text-emerald-400 tracking-tight">
              {currencyFormatter.format(Number(kpis.monthlyRecurringRevenue))}
            </strong>
            <span className="text-[10px] text-slate-500 block">Faturamento recorrente</span>
          </div>
        </div>

        {/* KPI 3: Planos Vendidos */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Planos Ativos</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-bold text-white tracking-tight">
              {kpis.plansSold}
            </strong>
            <span className="text-[10px] text-slate-500 block">Assinaturas vigentes</span>
          </div>
        </div>

        {/* KPI 4: Licenças Expirando */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Expirando (30d)</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <strong className={`text-2xl font-bold tracking-tight ${kpis.expiringLicensesCount > 0 ? "text-amber-400" : "text-white"}`}>
              {kpis.expiringLicensesCount}
            </strong>
            <span className="text-[10px] text-slate-500 block">Requerem renovação</span>
          </div>
        </div>

        {/* KPI 5: Versão Atual */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Versão Disponível</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div>
            <strong className="text-xl font-bold text-white tracking-tight font-mono">
              {kpis.latestVersion}
            </strong>
            <span className="text-[10px] text-emerald-400 block font-semibold">Produção Ativa</span>
          </div>
        </div>

        {/* KPI 6: Usuários Conectados */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-400">Instâncias Online</span>
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-700/30">
              <Wifi className="h-4 w-4" />
            </div>
          </div>
          <div>
            <strong className="text-2xl font-bold text-white tracking-tight">
              {kpis.connectedUsersCount}
            </strong>
            <span className="text-[10px] text-slate-500 block">Ativas nas últimas 24h</span>
          </div>
        </div>
      </section>

      {/* Linha Analítica Intermediária: Distribuição de Planos + Alertas */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Distribuição por Planos */}
        <div className="lg:col-span-6 rounded-2xl border border-[#1b263b] bg-[#0c1425] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📦</span>
              <span>Distribuição por Planos Contratados</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("plans")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Ver Planos</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {Object.keys(distribution).length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum plano com assinatura ativa no momento.</p>
            ) : (
              Object.entries(distribution).map(([code, item]: [string, any]) => (
                <div key={code} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{item.name}</span>
                    <span className="text-slate-400 font-mono">
                      {item.count} assinaturas • {currencyFormatter.format(item.revenue)}/mês
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(10, (item.count / (kpis.plansSold || 1)) * 100))}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Auditoria Recente */}
        <div className="lg:col-span-6 rounded-2xl border border-[#1b263b] bg-[#0c1425] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🛡️</span>
              <span>Atividades de Auditoria em Tempo Real</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("audit")}
              className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>Ver Auditoria Completa</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentAuditLogs.slice(0, 4).map((log: any) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-xl border border-[#162238] bg-[#091122] p-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-300">
                    {log.action}
                  </span>
                  <span className="text-slate-300 font-medium truncate max-w-xs">
                    {log.performedBy || "Sistema"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabela de Licenças Ativas Recentes */}
      <section className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>🔑</span>
              <span>Licenças Criptografadas RSA Emitidas Recentemente</span>
            </h3>
            <p className="text-xs text-slate-400">
              Chaves assinadas digitalmente válidas para instâncias do CTRL-Farm.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("licenses")}
            className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <span>Gerenciar Todas</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#091122] text-[11px] font-semibold text-slate-400 border-b border-[#162238]">
              <tr>
                <th className="px-4 py-2.5">Chave de Ativação</th>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Plano</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Expiração</th>
                <th className="px-4 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162238]">
              {recentLicenses.map((lic: any) => (
                <tr key={lic.id} className="hover:bg-[#0e172a] transition">
                  <td className="px-4 py-3 font-mono font-bold text-white flex items-center gap-2">
                    <span>{lic.activationKey}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(lic.activationKey)}
                      title="Copiar chave"
                      className="text-slate-500 hover:text-white"
                    >
                      {copiedKey === lic.activationKey ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-200">
                    {lic.client?.name || "Cliente Master"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {lic.plan?.name || "Personalizado"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{lic.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-[11px]">
                    {new Date(lic.expiresAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onNavigate("licenses")}
                      className="rounded-lg border border-[#233352] bg-[#091122] px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-500"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
