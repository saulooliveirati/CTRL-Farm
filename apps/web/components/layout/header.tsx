"use client";

import { usePathname } from "next/navigation";

import type { PublicUser } from "@/lib/auth-types";
import { LogoutButton } from "./logout-button";

const roleLabels: Record<PublicUser["role"], string> = {
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  OPERATOR: "Operador",
  VIEWER: "Visualizador",
};

export function Header({ user }: { user: PublicUser }) {
  const pathname = usePathname();
  const titles: Record<string, string> = { "/printers": "Impressoras", "/filaments": "Filamentos", "/production": "Produção", "/customers": "Clientes", "/orders": "Pedidos" };
  const title = titles[pathname] ?? "Dashboard";
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <h1 className="text-lg font-semibold">{title}</h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border font-semibold">
            {initial}
          </div>

          <div className="hidden text-sm sm:block">
            <div className="font-medium">{user.name}</div>
            <div className="text-xs text-muted-foreground">
              {roleLabels[user.role]}
            </div>
          </div>
        </div>

        <LogoutButton />
      </div>
    </header>
  );
}
