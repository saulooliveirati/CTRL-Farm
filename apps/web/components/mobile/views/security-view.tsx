// ==============================================================================
// Tela de Segurança & Auditoria — CTRL Farm Manager Mobile
// Auditoria completa, logs de aprovação, controle de sessão JWT e Face ID
// ==============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { IOSCard } from '../ios-card';
import { AuditLoggerService, AuditLogEntry } from '@/services/mobile/audit-logger.service';
import { useHaptics } from '@/hooks/mobile/use-haptics';
import { Shield, Lock, Smartphone, Key, History, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface SecurityViewProps {
  onOpenEmergencyLock: () => void;
  isEmergencyLocked: boolean;
  onLockSession: () => void;
}

export function SecurityView({
  onOpenEmergencyLock,
  isEmergencyLocked,
  onLockSession,
}: SecurityViewProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const { triggerHaptic } = useHaptics();

  useEffect(() => {
    setLogs(AuditLoggerService.getInstance().getLogs());
  }, []);

  return (
    <div className="space-y-4 px-4 pt-2">
      
      {/* Card de Status da Sessão e Biometria */}
      <IOSCard variant="highlight" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-neon" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Sessão Gerencial Segura
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
            JWT Válido (2h)
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
          Autenticação com <strong>Apple Face ID</strong> ativa. Sessão expira automaticamente após <strong>5 minutos</strong> de inatividade.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onLockSession();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white py-2.5 text-xs font-bold border border-slate-700 active:scale-95 transition"
          >
            <Lock className="w-3.5 h-3.5 text-brand-neon" />
            <span>Bloquear Agora</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('heavy');
              onOpenEmergencyLock();
            }}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition active:scale-95 ${
              isEmergencyLocked
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>{isEmergencyLocked ? 'Farm Bloqueada' : 'Parada Emergência'}</span>
          </button>
        </div>
      </IOSCard>

      {/* Parâmetros de Segurança */}
      <IOSCard variant="surface" className="divide-y divide-slate-200/60 dark:divide-white/10 text-xs">
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-slate-900 dark:text-white">Autenticação Biométrica</span>
          </div>
          <span className="text-emerald-500 font-bold">Face ID Apple Ativo</span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-900 dark:text-white">Criptografia das Chaves</span>
          </div>
          <span className="font-mono text-slate-400">RSA 2048-bit</span>
        </div>

        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-400" />
            <span className="font-bold text-slate-900 dark:text-white">Auto-Lock por Inatividade</span>
          </div>
          <span className="text-slate-400">5 minutos</span>
        </div>
      </IOSCard>

      {/* Trilha de Auditoria (Audit Trail Completo) */}
      <IOSCard variant="surface" className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <History className="w-4 h-4 text-slate-400" />
            <span>Trilha de Auditoria (Últimas Ações)</span>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Imutável</span>
        </div>

        <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 p-3 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white">
                  {log.action}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    log.status === 'SUCCESS'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : log.status === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {log.status}
                </span>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>Por: <strong>{log.actor.name}</strong> ({log.actor.role})</span>
                <span className="font-mono text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 font-mono pt-0.5 truncate">
                Dispositivo: {log.device}
              </div>
            </div>
          ))}
        </div>
      </IOSCard>

    </div>
  );
}
