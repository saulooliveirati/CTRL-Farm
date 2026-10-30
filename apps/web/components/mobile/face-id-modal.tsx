// ==============================================================================
// Modal de Autenticação Biométrica Face ID (Apple TrueDepth & Fallback PIN)
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { useHaptics } from '@/hooks/mobile/use-haptics';
import { ShieldCheck, Delete, Lock, CheckCircle2 } from 'lucide-react';

interface FaceIdModalProps {
  isOpen: boolean;
  onAuthenticateFaceId: () => Promise<boolean>;
  onAuthenticatePin: (pin: string) => boolean;
  pinError: string | null;
  userName: string;
}

export function FaceIdModal({
  isOpen,
  onAuthenticateFaceId,
  onAuthenticatePin,
  pinError,
  userName,
}: FaceIdModalProps) {
  const [usePinMode, setUsePinMode] = useState<boolean>(false);
  const [pinDigits, setPinDigits] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);
  const { triggerHaptic } = useHaptics();

  if (!isOpen) return null;

  const handleStartFaceId = async () => {
    triggerHaptic('medium');
    setIsScanning(true);
    setScanSuccess(false);
    const success = await onAuthenticateFaceId();
    if (success) {
      setScanSuccess(true);
      triggerHaptic('success');
      setTimeout(() => {
        setIsScanning(false);
        setScanSuccess(false);
      }, 500);
    } else {
      setIsScanning(false);
      triggerHaptic('error');
    }
  };

  const handlePinPress = (digit: string) => {
    if (pinDigits.length < 6) {
      triggerHaptic('light');
      const nextPin = pinDigits + digit;
      setPinDigits(nextPin);
      if (nextPin.length === 6) {
        const ok = onAuthenticatePin(nextPin);
        if (ok) {
          triggerHaptic('success');
          setPinDigits('');
        } else {
          triggerHaptic('error');
          setTimeout(() => setPinDigits(''), 400);
        }
      }
    }
  };

  const handlePinDelete = () => {
    triggerHaptic('selection');
    setPinDigits((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-2xl bg-black/80 animate-in fade-in duration-300">
      <div className="w-full max-w-sm rounded-[36px] bg-[#121620] border border-white/10 p-7 shadow-2xl text-center flex flex-col items-center">
        
        {/* Ícone de Cadeado de Segurança */}
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-extrabold text-white">CTRL Farm Manager</h3>
        <p className="text-xs text-slate-400 mt-1">
          Sessão protegida para <strong>{userName}</strong>
        </p>

        {!usePinMode ? (
          /* ================= MODO FACE ID ================= */
          <div className="my-8 flex flex-col items-center">
            <div
              onClick={handleStartFaceId}
              className={`relative w-28 h-28 rounded-3xl border-2 flex items-center justify-center cursor-pointer transition-all duration-300 ${
                scanSuccess
                  ? 'border-emerald-400 bg-emerald-500/10'
                  : isScanning
                  ? 'border-cyan-400 bg-cyan-500/10 scale-105'
                  : 'border-slate-700 bg-slate-900/60 hover:border-slate-500'
              }`}
            >
              {/* Moldura do Face ID */}
              <div className="absolute inset-2 border border-dashed border-white/20 rounded-2xl pointer-events-none" />

              {scanSuccess ? (
                <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-in zoom-in-75 duration-200" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <div className="text-3xl mb-1">👤</div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Face ID
                  </span>
                </div>
              )}

              {/* Feixe de Escaneamento Laser Animado */}
              {isScanning && !scanSuccess && (
                <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-bounce rounded-full blur-[1px]" />
              )}
            </div>

            <p className="text-xs font-semibold text-slate-300 mt-4">
              {scanSuccess
                ? 'Identidade Confirmada!'
                : isScanning
                ? 'Escaneando sensor TrueDepth...'
                : 'Toque acima para autenticar com Face ID'}
            </p>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setUsePinMode(true);
              }}
              className="mt-6 text-xs font-bold text-brand-neon hover:underline"
            >
              Usar Código PIN de 6 Dígitos
            </button>
          </div>
        ) : (
          /* ================= MODO PIN DE 6 DÍGITOS ================= */
          <div className="my-6 w-full flex flex-col items-center">
            {/* Indicador de Bolinhas do PIN */}
            <div className="flex items-center gap-3 mb-6">
              {[0, 1, 2, 3, 4, 5].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                    pinDigits.length > idx
                      ? 'bg-brand-neon shadow-sm shadow-emerald-400 scale-110'
                      : 'border border-slate-600 bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <div className="text-[11px] text-rose-400 font-semibold mb-3">
                {pinError} (Padrão: 123456)
              </div>
            )}

            {/* Teclado Numérico Estilo iOS */}
            <div className="grid grid-cols-3 gap-3.5 w-full max-w-[260px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handlePinPress(digit)}
                  className="w-16 h-16 rounded-full bg-slate-800/80 active:bg-slate-700 text-white font-bold text-xl flex items-center justify-center transition shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setUsePinMode(false);
                }}
                className="w-16 h-16 rounded-full bg-transparent text-[11px] font-bold text-brand-neon flex items-center justify-center"
              >
                Face ID
              </button>
              <button
                type="button"
                onClick={() => handlePinPress('0')}
                className="w-16 h-16 rounded-full bg-slate-800/80 active:bg-slate-700 text-white font-bold text-xl flex items-center justify-center transition shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                className="w-16 h-16 rounded-full bg-transparent active:bg-slate-800 text-slate-400 flex items-center justify-center"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="text-[10px] text-slate-500 font-mono mt-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Criptografia Biométrica Local AES-256</span>
        </div>
      </div>
    </div>
  );
}
