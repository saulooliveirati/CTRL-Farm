// ==============================================================================
// Hook de Feedback Háptico e Sons de Sistema estilo iOS (Apple Taptic Engine)
// Simula o Taptic Engine do iPhone usando a Web Vibration API e Web Audio sintetizado
// ==============================================================================

'use client';

import { useCallback } from 'react';

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

export function useHaptics() {
  const triggerHaptic = useCallback((type: HapticType = 'light') => {
    if (typeof window === 'undefined') return;

    // 1. Vibração Nativa (quando suportada no navegador ou wrapper Capacitor)
    if ('vibrate' in navigator) {
      try {
        switch (type) {
          case 'selection':
          case 'light':
            navigator.vibrate(10);
            break;
          case 'medium':
            navigator.vibrate(22);
            break;
          case 'heavy':
            navigator.vibrate(35);
            break;
          case 'success':
            navigator.vibrate([15, 60, 20]);
            break;
          case 'warning':
            navigator.vibrate([25, 40, 25]);
            break;
          case 'error':
            navigator.vibrate([40, 60, 40, 60, 40]);
            break;
        }
      } catch {
        // Fallback silencioso
      }
    }

    // 2. Feedback Sonoro Sintético Sutil (estilo cliques táteis do iOS)
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freq = type === 'success' ? 880 : type === 'error' ? 220 : type === 'heavy' ? 300 : 600;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.type = 'sine';

        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (type === 'success' ? 0.08 : 0.04));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + (type === 'success' ? 0.08 : 0.04));
      }
    } catch {
      // Ignora se bloqueado por autoplay policy
    }
  }, []);

  return { triggerHaptic };
}
