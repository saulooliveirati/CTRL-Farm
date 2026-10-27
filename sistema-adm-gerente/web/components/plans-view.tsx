"use client";

import { Check, ShieldAlert, Sparkles, Key, Zap, Lock, Clock } from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function PlansView({ plans }: { plans: any[] }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b263b] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📦</span>
            <span>Matriz de Planos & Precificação Oficial</span>
          </h2>
          <p className="text-xs text-slate-400">
            Estrutura comercial dos planos de licenciamento contratáveis para o software CTRL-Farm.
          </p>
        </div>
      </div>

      {/* Grid com os 6 Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {plans.map((p) => {
          const isOwner = p.code === "UNLIMITED_OWNER";
          const isTrial = p.code === "TRIAL";
          const isBusiness = p.code === "BUSINESS";
          const isProfessional = p.code === "PROFESSIONAL";

          let borderClass = "border-[#1b263b] bg-[#0c1425]";
          let badgeText = "PÚBLICO";
          let badgeColor = "border-slate-700 bg-slate-800 text-slate-300";

          if (isOwner) {
            borderClass = "border-amber-500/50 bg-gradient-to-b from-[#1a1405] to-[#0c1425] shadow-lg shadow-amber-500/10";
            badgeText = "PRIVADO • PROPRIETÁRIO";
            badgeColor = "border-amber-500/40 bg-amber-950/60 text-amber-300";
          } else if (isBusiness) {
            borderClass = "border-cyan-500/40 bg-gradient-to-b from-[#091e2b] to-[#0c1425] shadow-lg shadow-cyan-500/10";
            badgeText = "MAIS POPULAR";
            badgeColor = "border-cyan-500/40 bg-cyan-950/60 text-cyan-300";
          } else if (isTrial) {
            borderClass = "border-purple-500/40 bg-[#0c1425]";
            badgeText = "TRIAL 7 DIAS";
            badgeColor = "border-purple-500/40 bg-purple-950/60 text-purple-300";
          }

          return (
            <div
              key={p.id}
              className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-1 ${borderClass}`}
            >
              <div className="space-y-4">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{p.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2">{p.description}</p>
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-[9px] font-bold border shrink-0 ${badgeColor}`}>
                    {badgeText}
                  </span>
                </div>

                {/* Preço */}
                <div className="border-y border-[#162238] py-3">
                  <div className="flex items-baseline gap-1.5">
                    <strong className="text-2xl font-black text-white">
                      {isTrial
                        ? "Grátis"
                        : isOwner
                          ? "Sem Custo"
                          : p.code === "ENTERPRISE"
                            ? "Sob Consulta"
                            : currencyFormatter.format(Number(p.monthlyPrice))}
                    </strong>
                    {!isTrial && !isOwner && p.code !== "ENTERPRISE" && (
                      <span className="text-xs text-slate-400 font-semibold">/mês</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-1">
                    <span>Usuários: {p.maxUsers === -1 ? "Ilimitados" : p.maxUsers}</span>
                    <span>•</span>
                    <span>Impressoras: {p.maxPrinters === -1 ? "Ilimitadas" : p.maxPrinters}</span>
                  </div>
                </div>

                {/* Lista de Recursos Liberados */}
                <div className="space-y-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Recursos Liberados:
                  </span>

                  {p.code === "STARTER" && (
                    <ul className="space-y-1.5 text-slate-300 text-[11px]">
                      <li className="flex items-center gap-2 text-emerald-400 font-medium">
                        <Check className="h-3.5 w-3.5" /> 1 Usuário Operador
                      </li>
                      <li className="flex items-center gap-2 text-emerald-400 font-medium">
                        <Check className="h-3.5 w-3.5" /> 1 Empresa
                      </li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Cadastro de Produtos & Filamentos</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Gerenciamento de Impressoras</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Estoque Básico & Custos Básicos</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Dashboard Simples</li>
                    </ul>
                  )}

                  {p.code === "PROFESSIONAL" && (
                    <ul className="space-y-1.5 text-slate-300 text-[11px]">
                      <li className="flex items-center gap-2 text-emerald-400 font-medium">
                        <Check className="h-3.5 w-3.5" /> Até 5 Usuários
                      </li>
                      <li className="flex items-center gap-2 text-emerald-400 font-medium">
                        <Check className="h-3.5 w-3.5" /> Até 10 Impressoras 3D
                      </li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Módulo de Pedidos & Clientes</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Financeiro Básico</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Relatórios Operacionais</li>
                      <li className="flex items-center gap-2 text-cyan-400 font-medium">
                        <Check className="h-3.5 w-3.5" /> Marketplace Intelligence
                      </li>
                    </ul>
                  )}

                  {p.code === "BUSINESS" && (
                    <ul className="space-y-1.5 text-slate-300 text-[11px]">
                      <li className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Check className="h-3.5 w-3.5" /> Usuários Ilimitados
                      </li>
                      <li className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Check className="h-3.5 w-3.5" /> Suporte Multiempresa
                      </li>
                      <li className="flex items-center gap-2 text-emerald-400 font-medium">
                        <Check className="h-3.5 w-3.5" /> Módulo de Produção & Filas
                      </li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Matriz de Permissões Avançadas</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Financeiro Completo</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> API de Integração & Relatórios</li>
                    </ul>
                  )}

                  {p.code === "ENTERPRISE" && (
                    <ul className="space-y-1.5 text-slate-300 text-[11px]">
                      <li className="flex items-center gap-2 text-emerald-400 font-bold">
                        <Sparkles className="h-3.5 w-3.5" /> Todos os Recursos Liberados
                      </li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Multiempresa & Franquias</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Suporte e Treinamento Dedicado</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Customizações de Software Sob Demanda</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Integrações ERP Industriais</li>
                    </ul>
                  )}

                  {p.code === "TRIAL" && (
                    <ul className="space-y-1.5 text-slate-300 text-[11px]">
                      <li className="flex items-center gap-2 text-purple-400 font-bold">
                        <Zap className="h-3.5 w-3.5" /> 7 Dias Grátis para Testes
                      </li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Todos os recursos do Plano Professional</li>
                      <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-slate-500" /> Marketplace Intelligence Liberado</li>
                      <li className="flex items-center gap-2 text-amber-400 font-medium">
                        <Clock className="h-3.5 w-3.5" /> Expira Automaticamente em 7 Dias
                      </li>
                    </ul>
                  )}

                  {p.code === "UNLIMITED_OWNER" && (
                    <ul className="space-y-1.5 text-amber-300 text-[11px]">
                      <li className="flex items-center gap-2 font-bold">
                        <Lock className="h-3.5 w-3.5" /> Acesso Máximo Irrevogável
                      </li>
                      <li className="flex items-center gap-2 font-medium">
                        <Check className="h-3.5 w-3.5" /> Sem Limite de Usuários, Empresas ou Impressoras
                      </li>
                      <li className="flex items-center gap-2 font-medium">
                        <Check className="h-3.5 w-3.5" /> Acesso a Todas as Telas e APIs
                      </li>
                      <li className="flex items-center gap-2 text-slate-400">
                        <span>🛡️</span> Exclusivo para o Proprietário do CTRL-Farm
                      </li>
                    </ul>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 pt-3 border-t border-[#162238] flex items-center justify-between text-[11px] text-slate-500">
                <span>Código: <strong className="font-mono text-slate-300">{p.code}</strong></span>
                <span>{p._count?.subscriptions || 0} assinaturas</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
