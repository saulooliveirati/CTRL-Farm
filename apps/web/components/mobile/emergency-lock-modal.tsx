// ==============================================================================
// Modal de Bloqueio Remoto Emergencial da Farm (Emergency Stop & Lockout)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { AlertOctagon, X, Power, ShieldAlert } from 'lucide-react';
import { useHaptics } from '@/hooks/mobile/use-haptics';

interface EmergencyLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmLock: (reason: string) => void;
}

export function EmergencyLockModal({
  isOpen,
  onClose,
  onConfirmLock,
}: EmergencyLockModalProps) {
  const [reason, setReason] = useState<string>('Parada preventiva acionada pelo gerente móvel');
  const [sliderValue, setSliderValue] = useState<number>(0);
  const { triggerHaptic } = useHaptics();

  if (!isOpen) return null;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setSliderValue(val);
    if (val >= 95) {
      triggerHaptic('heavy');
      onConfirmLock(reason);
      setSliderValue(0);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl bg-black/80 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-t-[36px] sm:rounded-[36px] bg-[#121622] border border-rose-500/30 p-6 shadow-2xl flex flex-col space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-rose-400 font-extrabold text-base">
            <AlertOctagon className="w-6 h-6 animate-pulse" />
            <span>Bloqueio Remoto da Farm</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Esta ação enviará um sinal imediato de <strong>Parada de Emergência (M112)</strong> para todas as impressoras ativas, cortará o aquecimento das mesas e bicos e suspenderá a liberação de novos pedidos até nova autorização.
        </p>

        {/* Motivo do bloqueio */}
        <div>
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Motivo do Bloqueio:
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-400"
          />
        </div>

        {/* Deslize para Confirmar Estilo iOS */}
        <div className="pt-2">
          <label className="text-[11px] font-bold text-rose-400 block mb-1 text-center">
            Deslize até o fim para ATIVAR O BLOQUEIO:
          </label>
          <div className="relative w-full h-14 rounded-2xl bg-rose-950/40 border border-rose-500/40 flex items-center px-2 overflow-hidden">
            <div
              className="absolute left-0 top-0 bottom-0 bg-rose-600/30 transition-all pointer-events-none"
              style={{ width: `${sliderValue}%` }}
            />
            <span className="w-full text-center text-xs font-bold text-rose-300 pointer-events-none z-10 flex items-center justify-center gap-2">
              <Power className="w-4 h-4" />
              <span>Deslize para Bloquear</span>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderValue}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
            />
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono text-center flex items-center justify-center gap-1.5 pt-1">
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span>Comando auditado e assinado criptograficamente</span>
        </div>

      </div>
    </div>
  );
}
