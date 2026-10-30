// ==============================================================================
// Shell Principal Estilo iPhone 14 / iOS Human Interface Guidelines
// Oferece Ilha Dinâmica (Dynamic Island), Home Indicator e Alternador de Viewport
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { useHaptics } from '@/hooks/mobile/use-haptics';

interface IOSShellProps {
  children: React.ReactNode;
  activePrinterStatus?: string;
  isEmergencyLocked?: boolean;
}

export function IOSShell({
  children,
  activePrinterStatus = '3 Impressoras Ativas • 74% Médio',
  isEmergencyLocked = false,
}: IOSShellProps) {
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(false);
  const [dynamicIslandExpanded, setDynamicIslandExpanded] = useState<boolean>(false);
  const { triggerHaptic } = useHaptics();

  const toggleFrame = () => {
    triggerHaptic('selection');
    setDeviceFrameMode(!deviceFrameMode);
  };

  const handleIslandTap = () => {
    triggerHaptic('medium');
    setDynamicIslandExpanded(!dynamicIslandExpanded);
  };

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-[#070b12] text-slate-900 dark:text-slate-100 flex flex-col items-center justify-start transition-colors duration-200">
      
      {/* Barra de Controle de Pré-visualização Desktop (Aparece apenas em telas grandes) */}
      <div className="hidden lg:flex w-full items-center justify-between px-6 py-2 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-white flex items-center gap-1">
            CTRL<span className="text-brand-neon">-Farm</span>
          </span>
          <span>• Modo Pré-visualização Executiva iPhone 14 (iOS 17/18 PWA)</span>
        </div>

        <button
          type="button"
          onClick={toggleFrame}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white px-3.5 py-1.5 font-bold transition shadow-sm"
        >
          {deviceFrameMode ? (
            <>
              <Monitor className="w-4 h-4 text-cyan-400" />
              <span>Modo Tela Cheia Fluida</span>
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Simulador Moldura iPhone 14</span>
            </>
          )}
        </button>
      </div>

      {/* Container Principal do App */}
      <div
        className={`w-full transition-all duration-300 ${
          deviceFrameMode
            ? 'max-w-[400px] my-6 rounded-[55px] p-3 bg-black border-[10px] border-slate-800 shadow-2xl shadow-emerald-950/40 relative overflow-hidden'
            : 'max-w-md min-h-screen flex flex-col relative'
        }`}
      >
        {/* Ilha Dinâmica (Dynamic Island do iPhone 14 Pro / 15 / 16) */}
        <div className="sticky top-0 z-50 flex flex-col items-center pt-2 pb-1 bg-white/80 dark:bg-black/80 backdrop-blur-2xl">
          <div
            onClick={handleIslandTap}
            className={`cursor-pointer rounded-full bg-black text-white px-3 py-1 flex items-center justify-between border border-white/10 shadow-lg transition-all duration-300 ${
              dynamicIslandExpanded ? 'w-[320px] h-14 px-4' : 'w-[185px] h-7'
            }`}
          >
            {/* Câmera TrueDepth & Sensor */}
            <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
              <div className="w-1 h-1 rounded-full bg-blue-950/80" />
            </div>

            {/* Conteúdo da Ilha Dinâmica */}
            {!dynamicIslandExpanded ? (
              <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-tight truncate max-w-[140px]">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isEmergencyLocked
                      ? 'bg-rose-500 animate-ping'
                      : 'bg-brand-neon animate-pulse'
                  }`}
                />
                <span className="truncate text-slate-200">
                  {isEmergencyLocked ? 'PARADA EMERGÊNCIA' : 'Farm: 74% Ativa'}
                </span>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between px-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🖨️</span>
                  <div>
                    <div className="font-bold text-white text-[11px] leading-tight">
                      Bambu Lab X1C #01
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      Imprimindo • 42 min restantes
                    </div>
                  </div>
                </div>
                <div className="text-[11px] font-mono font-extrabold text-white bg-slate-800 px-2 py-0.5 rounded-lg">
                  74%
                </div>
              </div>
            )}

            {/* Microfone / Sensor direito */}
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
              <div className="w-1 h-1 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>

        {/* Área de Conteúdo Scrollável */}
        <div className="flex-1 pb-24 overflow-y-auto">
          {children}
        </div>

        {/* Home Indicator do iOS no Rodapé */}
        <div className="fixed bottom-1 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-32 h-1 rounded-full bg-slate-400/40 dark:bg-white/30" />
        </div>

      </div>

    </div>
  );
}
