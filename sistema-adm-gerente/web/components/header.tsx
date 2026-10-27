"use client";

import { Shield, LogOut, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminHeader({
  activeTab,
  setActiveTab,
  adminUser,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  adminUser?: { name: string; username: string; role: string } | null;
}) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "clients", label: "Clientes", icon: "👥" },
    { id: "plans", label: "Planos", icon: "📦" },
    { id: "subscriptions", label: "Assinaturas", icon: "💳" },
    { id: "licenses", label: "Licenças & Chaves RSA", icon: "🔑" },
    { id: "updates", label: "Atualizações", icon: "🚀" },
    { id: "settings", label: "Configurações", icon: "⚙️" },
    { id: "audit", label: "Auditoria", icon: "🛡️" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#1b263b] bg-[#070b14]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Esquerda: Logo + Título */}
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-[#00df81] shadow-md shadow-emerald-500/10">
            <Shield className="h-5 w-5 text-[#00df81]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                Sistema ADM Gerente
              </h1>
              <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                PROPRIETÁRIO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Gestão Comercial & Licenciamento CTRL-Farm
            </p>
          </div>
        </div>

        {/* Direita: Status Online + Admin + Sair */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3 py-1 text-xs font-semibold text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Servidor de Licenças Online (4001)</span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#1b263b] bg-[#0c1425] px-3 py-1.5 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-[#00df81]" />
            <span className="font-semibold text-white">{adminUser?.name || "Administrador"}</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Sair do painel master"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[#1b263b] bg-[#0c1425] text-slate-400 transition hover:border-rose-500/50 hover:bg-rose-950/20 hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Barra de Navegação Horizontal */}
      <div className="border-t border-[#162238] bg-[#091122]/80 px-4 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto py-2 no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "border border-[#00df81]/50 bg-[#00df81]/15 text-[#00df81] shadow-sm shadow-[#00df81]/10"
                    : "border border-transparent text-slate-400 hover:border-[#1b263b] hover:bg-[#0c1425] hover:text-slate-200"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
