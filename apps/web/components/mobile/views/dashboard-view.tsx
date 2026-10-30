// ==============================================================================
// Tela Principal: Dashboard Executivo — CTRL Farm Manager Mobile
// Visão 360° com KPIs, Fluxo de Caixa, Produção, Estoque e Timeline Interativa
// ==============================================================================

'use client';

import React from 'react';
import { IOSCard } from '../ios-card';
import { IOSChart } from '../ios-chart';
import { useMobileFinance } from '@/hooks/mobile/use-mobile-finance';
import { useMobileFarm } from '@/hooks/mobile/use-mobile-farm';
import { useMobileMarketplace } from '@/hooks/mobile/use-mobile-marketplace';
import { useMobileAlerts } from '@/hooks/mobile/use-mobile-alerts';
import { useHaptics } from '@/hooks/mobile/use-haptics';
import {
  TrendingUp,
  Printer,
  ShoppingBag,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { MobileTab } from '../ios-bottom-nav';

interface DashboardViewProps {
  onNavigateTab: (tab: MobileTab) => void;
  onOpenAIQuickPrompt?: (prompt: string) => void;
}

export function DashboardView({ onNavigateTab, onOpenAIQuickPrompt }: DashboardViewProps) {
  const { summary, cashflowData, period, setPeriod } = useMobileFinance();
  const { printers } = useMobileFarm();
  const { orders } = useMobileMarketplace();
  const { alerts, unreadCount } = useMobileAlerts();
  const { triggerHaptic } = useHaptics();

  // Contadores rápidos de impressoras
  const printingCount = printers.filter((p) => p.status === 'Imprimindo').length;
  const heatingCount = printers.filter((p) => p.status === 'Aquecendo').length;
  const errorCount = printers.filter((p) => p.status === 'Erro').length;

  return (
    <div className="space-y-5 px-4 pt-2">
      
      {/* Banner de Alerta Crítico (se houver alertas não lidos) */}
      {unreadCount > 0 && (
        <div
          onClick={() => {
            triggerHaptic('medium');
            onNavigateTab('more');
          }}
          className="rounded-2xl border border-rose-500/40 bg-gradient-to-r from-rose-950/60 to-rose-900/30 p-3.5 flex items-center justify-between cursor-pointer active:scale-[0.98] transition shadow-md shadow-rose-950/30"
        >
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            </span>
            <div>
              <div className="text-xs font-bold text-rose-200">
                {unreadCount} {unreadCount === 1 ? 'Alerta Crítico Requer Atenção' : 'Alertas Críticos Requerem Atenção'}
              </div>
              <div className="text-[11px] text-slate-300 line-clamp-1">
                {alerts[0]?.title || 'Verifique falhas ou estoque de filamento'}
              </div>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-300 shrink-0 ml-2" />
        </div>
      )}

      {/* Grid de KPIs Principais (Receita do Dia e Mês) */}
      <div className="grid grid-cols-2 gap-3">
        
        {/* Card 1: Receita do Dia */}
        <IOSCard variant="highlight" interactive onClick={() => onNavigateTab('finance')}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
              Receita Hoje
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
              +{summary.receitaDiaComparacao}%
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono mt-2">
            R$ {summary.receitaDia.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Meta diária: R$ 2.000,00 (74%)
          </p>
        </IOSCard>

        {/* Card 2: Lucro Líquido */}
        <IOSCard variant="surface" interactive onClick={() => onNavigateTab('finance')}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
              Lucro Líquido
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">
              {summary.margemLucroPercent}% Margem
            </span>
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono mt-2">
            R$ {summary.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Mês: R$ {summary.receitaMes.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
          </p>
        </IOSCard>

      </div>

      {/* Card de Gráfico Interativo de Fluxo de Caixa */}
      <IOSCard variant="glass">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-neon" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Fluxo de Caixa Operacional
            </h3>
          </div>

          {/* Seletor de Período estilo iOS */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 rounded-lg p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setPeriod('7d')}
              className={`px-2 py-0.5 rounded-md transition ${
                period === '7d'
                  ? 'bg-white dark:bg-brand-neon text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              7D
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30d')}
              className={`px-2 py-0.5 rounded-md transition ${
                period === '30d'
                  ? 'bg-white dark:bg-brand-neon text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              30D
            </button>
          </div>
        </div>

        <IOSChart data={cashflowData} height={170} />
      </IOSCard>

      {/* Widget da Farm & Impressoras */}
      <IOSCard variant="surface" interactive onClick={() => onNavigateTab('production')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <Printer className="w-4 h-4 text-emerald-500" />
            <span>Status da Produção (Farm)</span>
          </div>
          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
            Ver todas ({printers.length}) <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Resumo visual de status das impressoras */}
        <div className="grid grid-cols-3 gap-2 mt-3.5">
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-center">
            <div className="text-lg font-extrabold text-emerald-400 font-mono">
              {printingCount}
            </div>
            <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300">
              Imprimindo
            </div>
          </div>

          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-2.5 text-center">
            <div className="text-lg font-extrabold text-amber-400 font-mono">
              {heatingCount}
            </div>
            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-300">
              Aquecendo
            </div>
          </div>

          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-center">
            <div className="text-lg font-extrabold text-rose-400 font-mono">
              {errorCount}
            </div>
            <div className="text-[10px] font-bold text-rose-600 dark:text-rose-300">
              Com Erro
            </div>
          </div>
        </div>

        {/* Destaque da impressora com maior progresso */}
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {printers[0]?.name || 'Impressora Principal'}
            </span>
          </div>
          <div className="font-mono text-[11px] text-emerald-600 dark:text-brand-neon font-bold shrink-0">
            {printers[0]?.progress}% • {printers[0]?.timeRemainingMinutes}m rest.
          </div>
        </div>
      </IOSCard>

      {/* Widget de Marketplaces & Pedidos */}
      <IOSCard variant="surface" interactive onClick={() => onNavigateTab('marketplace')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm">
            <ShoppingBag className="w-4 h-4 text-cyan-400" />
            <span>Marketplaces & Pedidos</span>
          </div>
          <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
            {orders.length} pedidos hoje <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {orders.slice(0, 2).map((order) => (
            <div
              key={order.id}
              className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 p-3 flex items-center justify-between text-xs"
            >
              <div className="truncate pr-2">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-400">
                    {order.channel}
                  </span>
                  <span className="truncate">{order.customerName}</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {order.productSummary}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-slate-900 dark:text-white">
                  R$ {order.totalAmount.toFixed(2)}
                </div>
                <span className="text-[10px] font-bold text-emerald-500">
                  {order.status === 'EM_PRODUCAO' ? 'Em Produção' : 'Pendente'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </IOSCard>

      {/* IA Copilot Quick Action Card */}
      <div
        onClick={() => {
          triggerHaptic('medium');
          onNavigateTab('more');
        }}
        className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white shadow-xl shadow-emerald-950/30 cursor-pointer active:scale-[0.98] transition select-none"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-2xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-200">
                Copiloto Industrial IA
              </div>
              <div className="text-sm font-bold text-white">
                "Qual a previsão de término da fila noturna?"
              </div>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-200 shrink-0" />
        </div>
      </div>

      {/* Timeline de Eventos Recentes */}
      <IOSCard variant="surface">
        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-extrabold text-sm mb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>Timeline de Atividades Recentes</span>
        </div>

        <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
          
          <div className="flex items-start gap-3 relative z-10 text-xs">
            <span className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border-2 border-white dark:border-[#121824]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                Pedido #SHP-2026-9921 aprovado automaticamente
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Há 14 minutos • Venda Shopee R$ 189,90
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 relative z-10 text-xs">
            <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border-2 border-white dark:border-[#121824]">
              <Layers className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                Bambu Lab X1C atingiu 74% da engrenagem
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Há 28 minutos • Telemetria sem desvios
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 relative z-10 text-xs">
            <span className="w-7 h-7 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border-2 border-white dark:border-[#121824]">
              <AlertTriangle className="w-3.5 h-3.5" />
            </span>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                Subextrusão na Creality K1 Max #03
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Há 42 minutos • Notificação enviada ao gerente
              </div>
            </div>
          </div>

        </div>
      </IOSCard>

    </div>
  );
}
