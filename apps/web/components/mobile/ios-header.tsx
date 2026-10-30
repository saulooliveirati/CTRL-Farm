// ==============================================================================
// Header Estilo Apple iOS (Large Title, Frosted Glass, Status e Controles Rápidos)
// ==============================================================================

'use client';

import React from 'react';
import { Lock, Sun, Moon, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useHaptics } from '@/hooks/mobile/use-haptics';

interface IOSHeaderProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onLockSession: () => void;
  onOpenEmergencyLock: () => void;
  isEmergencyLocked: boolean;
  isConnected: boolean;
}

export function IOSHeader({
  title,
  subtitle = 'CTRL Farm Manager',
  isDark,
  onToggleTheme,
  onLockSession,
  onOpenEmergencyLock,
  isEmergencyLocked,
  isConnected,
}: IOSHeaderProps) {
  const { triggerHaptic } = useHaptics();

  return (
    <header className="sticky top-0 z-40 backdrop-blur-2xl bg-white/80 dark:bg-black/80 border-b border-slate-200/60 dark:border-white/10 px-4 pt-3 pb-3 transition-colors duration-200">
      <div className="flex items-center justify-between">
        
        {/* Identificação e Título */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#20c997] to-emerald-700 p-0.5 shadow-md shadow-emerald-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <span className="text-base">🖨️</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-brand-neon flex items-center gap-1.5">
              <span>{subtitle}</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
                title={isConnected ? 'Conectado ao WebSocket' : 'Modo Offline'}
              />
            </div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2">
          
          {/* Botão de Emergência da Fazenda */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('heavy');
              onOpenEmergencyLock();
            }}
            title="Parada de Emergência da Fazenda"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition shadow-sm ${
              isEmergencyLocked
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
          </button>

          {/* Alternador de Tema Claro / Escuro */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              onToggleTheme();
            }}
            title="Alternar Modo Claro / Escuro"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center justify-center border border-slate-200/60 dark:border-white/10 transition"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* Bloquear Sessão com Face ID */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              onLockSession();
            }}
            title="Bloquear Sessão (Face ID)"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center justify-center border border-slate-200/60 dark:border-white/10 transition"
          >
            <Lock className="w-4 h-4 text-emerald-500" />
          </button>

        </div>

      </div>
    </header>
  );
}
