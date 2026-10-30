"use client";

import type { PublicUser } from "@/lib/auth-types";
import { SupportChat } from "@/components/support/support-chat";

interface SupportTabProps {
  currentUser: PublicUser;
}

export function SupportTab({ currentUser }: SupportTabProps) {
  return (
    <div className="space-y-6">
      {/* CABEÇALHO DA ABA DE SUPORTE */}
      <div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-3xl">
              🎧
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                Central de Atendimento &amp; Suporte Técnico
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Suporte Híbrido com Inteligência Artificial para diagnóstico imediato e atendimento humano especializado com Acesso Remoto via Sistema ADM.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/30 px-3.5 py-2 text-center">
              <span className="block text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Status do Suporte
              </span>
              <span className="text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Operacional (24/7 IA + ADM)
              </span>
            </div>
          </div>
        </div>

        {/* Recursos Disponíveis */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-slate-800/80 pt-5 text-xs text-slate-300">
          <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-[#0a0f1b]/60 p-3">
            <span className="text-lg">🤖</span>
            <div>
              <strong className="block text-slate-200">IA Nível 1 Imediata</strong>
              <span className="text-[11px] text-slate-400 leading-tight">
                Respostas instantâneas para falhas de impressão, adesão, entupimentos e Klipper.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-[#0a0f1b]/60 p-3">
            <span className="text-lg">📷</span>
            <div>
              <strong className="block text-slate-200">Troca Multimídia</strong>
              <span className="text-[11px] text-slate-400 leading-tight">
                Envie fotos da peça, vídeos de defeito e grave mensagens de áudio pelo microfone.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-slate-800 bg-[#0a0f1b]/60 p-3">
            <span className="text-lg">🖥️</span>
            <div>
              <strong className="block text-slate-200">Acesso Remoto Assistido</strong>
              <span className="text-[11px] text-slate-400 leading-tight">
                Compartilhamento de tela em tempo real via WebRTC sob autorização do cliente (30 min).
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* CHAT INTEGRADO EM LARGURA TOTAL */}
      <div className="rounded-2xl border border-slate-800 bg-[#0e1726] p-4 shadow-xl">
        <SupportChat user={currentUser} isWidget={false} />
      </div>
    </div>
  );
}
