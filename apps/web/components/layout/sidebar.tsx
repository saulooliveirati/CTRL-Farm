"use client";

import Link from "next/link";

const navigation = [
  { label: "Dashboard", href: "/", icon: "⌂" },
  { label: "Impressoras", href: "/printers", icon: "▣" },
  { label: "Filamentos", href: "/filaments", icon: "◉" },
  { label: "Produção", href: "/production", icon: "▶" },
  { label: "Clientes", href: "/customers", icon: "♙" },
  { label: "Pedidos", href: "/orders", icon: "□" },
];

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r">
      <div className="flex h-16 items-center border-b px-6">
        <div>
          <div className="text-xl font-bold">CTRL+Farm</div>
          <div className="text-xs">
            Controle de Produção
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-gray-100"
          >
            <span className="w-5 text-center">
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="border-t p-4">
        <span className="px-3 py-2 text-xs text-muted-foreground">Mais módulos em breve</span>
      </div>
    </aside>
  );
}
