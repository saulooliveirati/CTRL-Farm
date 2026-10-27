"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Key, ShieldAlert } from "lucide-react";
import type { PublicUser } from "@/lib/auth-types";
import { useLicensing } from "@/contexts/licensing-context";
import { LogoutButton } from "./logout-button";

const titles: Record<string, string> = {
  "/": "Dashboard",
  "/live": "Monitoramento",
  "/equipment": "Equipamentos",
  "/printers": "Equipamentos",
  "/inventory": "Estoques",
  "/filaments": "Estoques",
  "/materials": "Estoques",
  "/contacts": "Contatos",
  "/suppliers": "Contatos",
  "/customers": "Contatos",
  "/production": "Produção",
  "/orders": "Orçamentos",
  "/project-files": "Arquivos STL",
  "/pricing": "Calculadora",
  "/profile": "Meu Perfil & Configurações",
  "/settings": "Configurações do Sistema & Acessos",
  "/ai-farm": "CTRL Bot · Inteligência Artificial",
};

export function Header({
  user,
  collapsed,
  mobileOpen,
  onToggle,
}: {
  user: PublicUser;
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const { isLicensed, planName, planCode, setIsActivationModalOpen } = useLicensing();

  const title =
    titles[pathname] ??
    Object.entries(titles).find(
      ([route]) => route !== "/" && pathname.startsWith(`${route}/`),
    )?.[1] ??
    "Dashboard";

  const role = {
    ADMIN: "Administrador",
    MANAGER: "Moderador",
    OPERATOR: "Operação",
    VIEWER: "Padrão",
  }[user.role];

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-[#0a0f1b]/95 px-3 backdrop-blur-md sm:px-5 lg:px-7">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label={mobileOpen ? "Fechar menu" : collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={mobileOpen || !collapsed}
          onClick={onToggle}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-800 text-slate-300 transition hover:border-emerald-400/50 hover:bg-slate-800"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <span className="text-lg leading-none">{mobileOpen ? "×" : "☰"}</span>
        </button>
        <div className="min-w-0">
          <p className="hidden text-[9px] font-semibold uppercase tracking-[0.2em] text-emerald-400 sm:block">
            CTRL+Farm · Operação
          </p>
          <h1 className="truncate text-sm font-semibold text-white sm:text-base">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Pill dinâmico do Plano Ativo ou Alerta de Licença */}
        {isLicensed ? (
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-emerald-500/30 bg-emerald-950/40 text-emerald-400 hover:border-emerald-500/60 hover:bg-emerald-950/60 transition text-xs font-bold"
            title={`Licença Ativa: ${planName} (${planCode})`}
          >
            <Key className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">{planName}</span>
            <span className="sm:hidden">{planCode}</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setIsActivationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl border border-rose-500/40 bg-rose-950/50 text-rose-300 hover:border-rose-400 transition text-xs font-bold animate-pulse"
            title="Chave de ativação necessária"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Ativar Chave</span>
          </button>
        )}

        <Link
          href="/profile"
          title="Configurações do Perfil e Conta"
          className="group flex items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-1.5 transition hover:border-slate-700 hover:bg-slate-800/60"
        >
          <div className="hidden text-right sm:block">
            <p className="max-w-40 truncate text-xs font-semibold text-slate-200 group-hover:text-emerald-300">
              {user.name}
            </p>
            <p className="text-[10px] text-slate-500">{role}</p>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-xs font-bold text-emerald-300 transition group-hover:scale-105 group-hover:border-emerald-400">
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
        </Link>
        <LogoutButton />
      </div>
    </header>
  );
}
