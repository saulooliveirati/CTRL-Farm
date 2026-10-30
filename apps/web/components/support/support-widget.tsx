"use client";

import { useState } from "react";
import type { PublicUser } from "@/lib/auth-types";
import { SupportChat } from "./support-chat";

interface SupportWidgetProps {
  user: PublicUser;
}

export function SupportWidget({ user }: SupportWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      role="complementary"
      aria-label="Widget de Suporte Técnico"
      className="fixed bottom-6 right-6 z-40 flex flex-col items-end"
    >
      {/* JANELA DO CHAT FLUTUANTE */}
      {isOpen && (
        <div className="mb-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <SupportChat
            user={user}
            isWidget={true}
            onCloseWidget={() => setIsOpen(false)}
          />
        </div>
      )}

      {/* BOTÃO DISPARADOR FLUTUANTE */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-2.5 rounded-2xl border border-emerald-500/40 bg-[#101827]/95 px-4 py-3 text-xs font-bold text-slate-100 shadow-2xl shadow-emerald-950/60 backdrop-blur-md transition hover:scale-105 hover:border-emerald-400 hover:bg-[#132034] active:scale-95"
        title="Abrir Suporte Técnico Inteligente e Humano"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 text-base shadow-md group-hover:rotate-6 transition">
          🎧
        </span>
        <span className="flex flex-col text-left">
          <span className="text-[12px] font-bold text-slate-100 flex items-center gap-1.5">
            Suporte Técnico
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="text-[10px] font-normal text-slate-400">
            {isOpen ? "Clique para minimizar" : "IA Nível 1 & Humano"}
          </span>
        </span>
      </button>
    </aside>
  );
}
