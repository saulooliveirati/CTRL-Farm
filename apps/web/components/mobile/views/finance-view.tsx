// ==============================================================================
// Tela Financeira & Fluxo de Caixa — CTRL Farm Manager Mobile
// Visão completa: Fluxo de caixa, Contas a Receber/Pagar, Lucro, Comissões e MRR
// ==============================================================================

'use client';

import React from 'react';
import { IOSCard } from '../ios-card';
import { IOSChart } from '../ios-chart';
import { IOSSegmentedControl } from '../ios-segmented-control';
import { useMobileFinance } from '@/hooks/mobile/use-mobile-finance';
import { DollarSign, ArrowUpRight, ArrowDownLeft, ShieldCheck, PieChart, Users, FileText } from 'lucide-react';

export function FinanceView() {
  const { summary, cashflowData, period, setPeriod, pendingPayables, pendingReceivables } =
    useMobileFinance();

  return (
    <div className="space-y-4 px-4 pt-2">
      
      {/* Seletor de Período */}
      <IOSSegmentedControl
        options={[
          { value: '7d', label: 'Últimos 7 Dias' },
          { value: '30d', label: 'Mensal (30D)' },
        ]}
        value={period}
        onChange={(val) => setPeriod(val as any)}
        size="sm"
      />

      {/* Card Principal de Resumo Financeiro */}
      <IOSCard variant="highlight" className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase font-bold text-emerald-600 dark:text-brand-neon tracking-wider">
            Balanço Consolidado
          </span>
          <span className="text-xs font-bold font-mono text-emerald-400">
            Margem Real: {summary.margemLucroPercent}%
          </span>
        </div>

        <div>
          <div className="text-3xl font-black text-slate-900 dark:text-white font-mono">
            R$ {summary.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Lucro Líquido Acumulado • Faturamento: R$ {summary.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* Barra de Progresso da Meta do Mês */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Meta Mensal: R$ {summary.receitaMesMeta.toLocaleString('pt-BR')}</span>
            <span className="font-bold text-emerald-500 font-mono">
              {((summary.receitaMes / summary.receitaMesMeta) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
              style={{ width: `${(summary.receitaMes / summary.receitaMesMeta) * 100}%` }}
            />
          </div>
        </div>
      </IOSCard>

      {/* Gráfico de Linha de Fluxo de Caixa */}
      <IOSCard variant="glass">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm mb-2">
          <PieChart className="w-4 h-4 text-emerald-500" />
          <span>Curva de Entradas vs Saídas</span>
        </div>
        <IOSChart data={cashflowData} height={170} />
      </IOSCard>

      {/* Grid: Contas a Receber vs Contas a Pagar */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Contas a Receber */}
        <IOSCard variant="surface">
          <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
            <ArrowDownLeft className="w-4 h-4" />
            <span>A Receber</span>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono mt-2">
            R$ {summary.contasReceber.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-400">Próximos 15 dias</span>
        </IOSCard>

        {/* Contas a Pagar */}
        <IOSCard variant="surface">
          <div className="flex items-center gap-1.5 text-rose-500 text-xs font-bold">
            <ArrowUpRight className="w-4 h-4" />
            <span>A Pagar</span>
          </div>
          <div className="text-xl font-black text-rose-500 dark:text-rose-400 font-mono mt-2">
            R$ {summary.contasPagar.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-400">Fornecedores & Luz</span>
        </IOSCard>

      </div>

      {/* Comissões de Consignados & Assinaturas MRR */}
      <div className="grid grid-cols-2 gap-3">
        
        <IOSCard variant="surface">
          <div className="flex items-center gap-1.5 text-cyan-400 text-xs font-bold">
            <Users className="w-4 h-4" />
            <span>Consignações</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1.5">
            R$ {summary.comissoesConsignados.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-400">Comissões a acertar</span>
        </IOSCard>

        <IOSCard variant="surface">
          <div className="flex items-center gap-1.5 text-purple-400 text-xs font-bold">
            <DollarSign className="w-4 h-4" />
            <span>MRR Planos</span>
          </div>
          <div className="text-lg font-black text-slate-900 dark:text-white font-mono mt-1.5">
            R$ {summary.mrrAssinaturas.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </div>
          <span className="text-[10px] text-slate-400">{summary.totalAssinantes} clientes ativos</span>
        </IOSCard>

      </div>

      {/* Lista de Contas Pendentes */}
      <IOSCard variant="surface">
        <div className="flex items-center justify-between text-xs font-extrabold text-slate-900 dark:text-white mb-3">
          <span className="flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Contas a Pagar Agendadas</span>
          </span>
          <span className="text-rose-500 font-mono font-bold">
            {pendingPayables.length} pendentes
          </span>
        </div>

        <div className="space-y-2.5">
          {pendingPayables.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 p-3 flex items-center justify-between text-xs"
            >
              <div>
                <div className="font-bold text-slate-900 dark:text-white">
                  {item.description}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Vencimento: {item.dueDate} • {item.status}
                </div>
              </div>
              <div className="text-right shrink-0 font-mono font-bold text-rose-500 dark:text-rose-400">
                R$ {item.amount.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </IOSCard>

    </div>
  );
}
