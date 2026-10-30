// ==============================================================================
// Tela de Aprovações Rápidas (1 Toque) — CTRL Farm Manager Mobile
// Aprovação de pedidos, cancelamento, liberação de produção, desconto e pagamentos
// ==============================================================================

'use client';

import React from 'react';
import { IOSCard } from '../ios-card';
import { useMobileApprovals, ApprovalType } from '@/hooks/mobile/use-mobile-approvals';
import { useHaptics } from '@/hooks/mobile/use-haptics';
import { Check, X, ShieldAlert, Clock, CheckCircle2, XCircle } from 'lucide-react';

export function ApprovalsView() {
  const { approvals, pendingCount, approveItem, rejectItem } = useMobileApprovals();
  const { triggerHaptic } = useHaptics();

  const typeLabels: Record<ApprovalType, { label: string; color: string }> = {
    DESCONTO: { label: 'Desconto Comercial', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    PRODUCAO: { label: 'Ordem de Produção', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    PAGAMENTO: { label: 'Liberação Pagamento', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    PEDIDO: { label: 'Pedido Especial', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    CANCELAMENTO: { label: 'Cancelamento', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  };

  const handleApprove = (id: string) => {
    triggerHaptic('success');
    approveItem(id);
  };

  const handleReject = (id: string) => {
    triggerHaptic('warning');
    rejectItem(id);
  };

  return (
    <div className="space-y-4 px-4 pt-2">
      
      {/* Banner de Status de Aprovações */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
          Fila de Decisões Gerenciais
        </span>
        <span className="text-[11px] font-bold text-amber-500">
          {pendingCount} {pendingCount === 1 ? 'pendência' : 'pendências'}
        </span>
      </div>

      {/* Lista de Solicitações */}
      <div className="space-y-3.5">
        {approvals.map((item) => {
          const typeMeta = typeLabels[item.type];
          const isPending = item.status === 'PENDENTE';

          return (
            <IOSCard
              key={item.id}
              variant={item.urgent && isPending ? 'highlight' : 'surface'}
              className="space-y-3"
            >
              {/* Header do Item */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${typeMeta.color}`}
                >
                  {typeMeta.label}
                </span>

                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{item.requestedAt}</span>
                </div>
              </div>

              {/* Título & Detalhes */}
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {item.description}
                </p>
                <div className="text-[11px] text-slate-400 mt-2 font-medium">
                  Solicitante: <strong className="text-slate-700 dark:text-slate-300">{item.requestedBy}</strong>
                  {item.amount && (
                    <span className="ml-2 font-mono font-bold text-slate-900 dark:text-white">
                      • R$ {item.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              {/* Botões de Decisão com 1 Toque ou Status Final */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2.5">
                {isPending ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReject(item.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 text-xs font-bold active:scale-95 transition"
                    >
                      <X className="w-4 h-4" />
                      <span>Recusar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(item.id)}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition"
                    >
                      <Check className="w-4 h-4" strokeWidth={3} />
                      <span>Aprovar</span>
                    </button>
                  </>
                ) : item.status === 'APROVADO' ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Aprovado por Saulo Oliveira</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/30">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Recusado pelo Gerente</span>
                  </span>
                )}
              </div>
            </IOSCard>
          );
        })}
      </div>

    </div>
  );
}
