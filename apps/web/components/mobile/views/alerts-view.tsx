// ==============================================================================
// Tela de Alertas & Notificações Críticas — CTRL Farm Manager Mobile
// Central de avisos de falhas, filamento baixo, aprovação de clientes e pagamentos
// ==============================================================================

'use client';

import React from 'react';
import { IOSCard } from '../ios-card';
import { useMobileAlerts, AlertSeverity } from '@/hooks/mobile/use-mobile-alerts';
import { useHaptics } from '@/hooks/mobile/use-haptics';
import {
  AlertTriangle,
  Flame,
  UserCheck,
  CreditCard,
  Package,
  Check,
  Trash2,
} from 'lucide-react';

export function AlertsView() {
  const { alerts, unreadCount, markAsRead, markAllAsRead, dismissAlert } = useMobileAlerts();
  const { triggerHaptic } = useHaptics();

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'FALHA':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      case 'FILAMENTO':
        return <Flame className="w-4 h-4 text-amber-400" />;
      case 'CLIENTE':
        return <UserCheck className="w-4 h-4 text-cyan-400" />;
      case 'PAGAMENTO':
        return <CreditCard className="w-4 h-4 text-purple-400" />;
      case 'PEDIDO':
      default:
        return <Package className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40">
            Crítico
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">
            Atenção
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-500/20 text-slate-400 border border-slate-500/40">
            Informativo
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 px-4 pt-2">
      
      {/* Header com Ação de Marcar Todas como Lidas */}
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
          Central de Alertas ({unreadCount} não lidos)
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              markAllAsRead();
            }}
            className="text-[11px] font-bold text-brand-neon hover:underline"
          >
            Marcar todos como lidos
          </button>
        )}
      </div>

      {/* Lista de Alertas */}
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Nenhum alerta pendente. A fazenda está operando 100% normalmente!
          </div>
        ) : (
          alerts.map((alt) => (
            <IOSCard
              key={alt.id}
              variant={alt.severity === 'CRITICAL' ? 'highlight' : 'surface'}
              className={`space-y-2.5 transition-opacity ${alt.read ? 'opacity-70' : 'opacity-100'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-white/10">
                    {getAlertIcon(alt.type)}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      {alt.title}
                    </h4>
                    <span className="text-[10px] text-slate-400">{alt.timestamp}</span>
                  </div>
                </div>

                <div>{getSeverityBadge(alt.severity)}</div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-10">
                {alt.message}
              </p>

              <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-end gap-2 text-xs">
                {!alt.read && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      markAsRead(alt.id);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-500 hover:underline px-2 py-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Marcar como lido</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    dismissAlert(alt.id);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-rose-400 px-2 py-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Dispensar</span>
                </button>
              </div>
            </IOSCard>
          ))
        )}
      </div>

    </div>
  );
}
