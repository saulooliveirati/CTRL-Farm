"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { PublicUser } from "@/lib/auth-types";
import { useLicensing } from "@/contexts/licensing-context";
import {
  DashboardNavIcon,
  EquipmentNavIcon,
  StocksNavIcon,
  ContactsNavIcon,
  CalculatorNavIcon,
  ProductionNavIcon,
  QuotesNavIcon,
  StlFolderNavIcon,
  CameraNavIcon,
  AiBotNavIcon,
  SettingsNavIcon,
  MarketplaceNavIcon,
  ConsignmentsNavIcon,
} from "@/components/icons/nav-icons";

export interface SubmenuItem {
  key: string;
  label: string;
  icon?: string | ReactNode;
}

interface NavItemConfig {
  label: string;
  href: string;
  aliases?: string[];
  icon: ReactNode;
  sectionKey?: "EQUIPMENT" | "INVENTORY" | "CONTACTS" | "PROJECT_FILES" | "SETTINGS" | "CONSIGNMENTS";
  defaultTabKey?: string;
}

const BASE_NAVIGATION: NavItemConfig[] = [
  { label: "Dashboard", href: "/", icon: <DashboardNavIcon /> },
  {
    label: "Equipamentos",
    href: "/equipment",
    aliases: ["/printers"],
    icon: <EquipmentNavIcon />,
    sectionKey: "EQUIPMENT",
    defaultTabKey: "printers",
  },
  {
    label: "Estoques",
    href: "/inventory",
    aliases: ["/filaments", "/materials"],
    icon: <StocksNavIcon />,
    sectionKey: "INVENTORY",
    defaultTabKey: "filaments",
  },
  {
    label: "Contatos",
    href: "/contacts",
    aliases: ["/customers", "/suppliers"],
    icon: <ContactsNavIcon />,
    sectionKey: "CONTACTS",
    defaultTabKey: "customers",
  },
  { label: "Calculadora", href: "/pricing", icon: <CalculatorNavIcon /> },
  { label: "Plano Marketplace", href: "/marketplace", icon: <MarketplaceNavIcon /> },
  { label: "Produção", href: "/production", icon: <ProductionNavIcon /> },
  { label: "Orçamentos", href: "/orders", icon: <QuotesNavIcon /> },
  {
    label: "Consignados",
    href: "/consignments",
    icon: <ConsignmentsNavIcon />,
    sectionKey: "CONSIGNMENTS",
    defaultTabKey: "dashboard",
  },
  {
    label: "Arquivos STL",
    href: "/project-files",
    icon: <StlFolderNavIcon />,
    sectionKey: "PROJECT_FILES",
    defaultTabKey: "all",
  },
  { label: "Monitoramento", href: "/live", icon: <CameraNavIcon /> },
  { label: "CTRL Bot", href: "/ai-farm", icon: <AiBotNavIcon /> },
];

interface DynamicSectionTab {
  id: string;
  key: string;
  label: string;
  icon?: string | null;
  section: "EQUIPMENT" | "INVENTORY" | "CONTACTS";
}

export function Sidebar({
  user,
  collapsed,
  mobileOpen,
  onClose,
}: {
  user: PublicUser;
  collapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const [localTab, setLocalTab] = useState<string | null>(null);

  useEffect(() => {
    setLocalTab(currentTab);
  }, [currentTab]);

  useEffect(() => {
    setLocalTab(null);
  }, [pathname]);

  useEffect(() => {
    const handleTabSelected = (e: Event) => {
      const customEvent = e as CustomEvent<{ key: string }>;
      if (customEvent.detail?.key) {
        setLocalTab(customEvent.detail.key);
      }
    };
    window.addEventListener("ctrlfarm:tab-selected", handleTabSelected);
    return () => window.removeEventListener("ctrlfarm:tab-selected", handleTabSelected);
  }, []);

  const activeTabKey = localTab ?? currentTab;

  const { isLicensed, planName, isRouteAllowed, hasFeature } = useLicensing();
  const initial = user.name.trim().charAt(0).toUpperCase() || "U";
  const canShowPermissionsMatrix = isLicensed && (hasFeature("permissionsMatrix") || hasFeature("permissions"));

  // Abas dinâmicas registradas no banco (Equipamentos, Estoques e Contatos)
  const [dynamicTabs, setDynamicTabs] = useState<{
    EQUIPMENT: DynamicSectionTab[];
    INVENTORY: DynamicSectionTab[];
    CONTACTS: DynamicSectionTab[];
  }>({
    EQUIPMENT: [],
    INVENTORY: [],
    CONTACTS: [],
  });

  // Controle de expansão de sanfona (accordion) para submenus
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Carrega todas as abas cadastradas (padrão e futuras)
  const loadTabs = useCallback(async () => {
    try {
      const res = await fetch("/api/section-tabs?section=ALL");
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        if (data && typeof data === "object") {
          setDynamicTabs({
            EQUIPMENT: Array.isArray(data.EQUIPMENT) ? data.EQUIPMENT : [],
            INVENTORY: Array.isArray(data.INVENTORY) ? data.INVENTORY : [],
            CONTACTS: Array.isArray(data.CONTACTS) ? data.CONTACTS : [],
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadTabs();

    // Escuta evento customizado disparado em qualquer página quando uma nova aba é adicionada, editada ou removida
    const handleTabsUpdated = () => {
      loadTabs();
    };

    window.addEventListener("ctrlfarm:tabs-updated", handleTabsUpdated);
    return () => window.removeEventListener("ctrlfarm:tabs-updated", handleTabsUpdated);
  }, [loadTabs]);

  // Submenus dinâmicos calculados
  const equipmentSubmenus = useMemo<SubmenuItem[]>(() => {
    if (dynamicTabs.EQUIPMENT.length > 0) {
      return dynamicTabs.EQUIPMENT.map((t) => ({
        key: t.key,
        label: t.label,
        icon: t.icon === "fdm_printer" ? "🖨️" : t.icon || "⚙️",
      }));
    }
    return [{ key: "printers", label: "Impressoras 3D", icon: "🖨️" }];
  }, [dynamicTabs.EQUIPMENT]);

  const inventorySubmenus = useMemo<SubmenuItem[]>(() => {
    if (dynamicTabs.INVENTORY.length > 0) {
      return dynamicTabs.INVENTORY.map((t) => ({
        key: t.key,
        label: t.label,
        icon:
          t.icon === "filaments"
            ? "🧵"
            : t.icon === "materials"
            ? "📦"
            : t.icon === "products"
            ? "🛍️"
            : t.icon || "📦",
      }));
    }
    return [
      { key: "filaments", label: "Filamentos", icon: "🧵" },
      { key: "materials", label: "Insumos", icon: "📦" },
      { key: "products", label: "Produtos", icon: "🛍️" },
    ];
  }, [dynamicTabs.INVENTORY]);

  const contactsSubmenus = useMemo<SubmenuItem[]>(() => {
    if (dynamicTabs.CONTACTS.length > 0) {
      return dynamicTabs.CONTACTS.map((t) => ({
        key: t.key,
        label: t.label,
        icon: t.icon === "customers" ? "👥" : t.icon === "suppliers" ? "🚚" : t.icon || "📇",
      }));
    }
    return [
      { key: "customers", label: "Clientes", icon: "👥" },
      { key: "suppliers", label: "Fornecedores", icon: "🚚" },
    ];
  }, [dynamicTabs.CONTACTS]);

  const consignmentsSubmenus = useMemo<SubmenuItem[]>(() => [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "partners", label: "Parceiros", icon: "🤝" },
    { key: "stock", label: "Estoque Consignado", icon: "📦" },
    { key: "shipments", label: "Envio de Produtos", icon: "🚚" },
    { key: "sales", label: "Vendas", icon: "🛒" },
    { key: "returns", label: "Devoluções", icon: "↩️" },
    { key: "settlements", label: "Acertos Financeiros", icon: "💰" },
    { key: "reports", label: "Relatórios", icon: "📈" },
    { key: "settings", label: "Configurações", icon: "⚙️" },
  ], []);

  const projectFilesSubmenus = useMemo<SubmenuItem[]>(() => [
    { key: "all", label: "Todos os Arquivos", icon: "📁" },
    { key: "projects", label: "Projetos 3D", icon: "🧊" },
    { key: "marketplace", label: "Marketplace", icon: "🛒" },
    { key: "ideas", label: "Ideias & Modelos", icon: "💡" },
  ], []);

  const settingsSubmenus = useMemo<SubmenuItem[]>(() => {
    const list: SubmenuItem[] = [
      { key: "company", label: "Dados da Empresa", icon: "🏢" },
      { key: "users", label: "Usuários & Equipe", icon: "👥" },
    ];
    if (canShowPermissionsMatrix) {
      list.push({ key: "matrix", label: "Matriz de Permissões", icon: "🛡️" });
    }
    list.push(
      { key: "system", label: "Parâmetros da Farm", icon: "⚙️" },
      { key: "lgpd", label: "Privacidade & LGPD", icon: "📜" },
      { key: "licensing", label: "Assinatura & Updates", icon: "🔑" },
      { key: "firebase", label: "Nuvem & Firebase", icon: "☁️" },
      { key: "backup", label: "Backup do Serviço", icon: "💾" }
    );
    return list;
  }, [canShowPermissionsMatrix]);

  function getSubmenusForSection(sectionKey?: string): SubmenuItem[] {
    switch (sectionKey) {
      case "EQUIPMENT":
        return equipmentSubmenus;
      case "INVENTORY":
        return inventorySubmenus;
      case "CONTACTS":
        return contactsSubmenus;
      case "CONSIGNMENTS":
        return consignmentsSubmenus;
      case "PROJECT_FILES":
        return projectFilesSubmenus;
      case "SETTINGS":
        return settingsSubmenus;
      default:
        return [];
    }
  }

  // Verifica se uma seção deve estar expandida
  const isSectionOpen = (href: string) => {
    if (expandedSections[href] !== undefined) {
      return expandedSections[href];
    }
    // Expande automaticamente a página atualmente visitada
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const toggleSection = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSections((prev) => ({
      ...prev,
      [href]: !isSectionOpen(href),
    }));
  };

  // Filtra itens permitidos pelo plano
  const visibleNavigation = BASE_NAVIGATION.filter((item) => {
    if (item.href === "/") return true;
    return isRouteAllowed(item.href);
  });

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] lg:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[275px] flex-col border-r border-slate-800 bg-[#070c16] text-slate-200 transition-[width,transform] duration-200 lg:sticky lg:top-0 lg:z-20 lg:h-screen lg:translate-x-0 ${
          collapsed ? "lg:w-[76px]" : "lg:w-[255px]"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Cabeçalho do Menu */}
        <div
          className={`flex h-16 shrink-0 items-center border-b border-slate-800 ${
            collapsed ? "lg:justify-center lg:px-2" : "gap-3 px-4"
          }`}
        >
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-400 text-lg font-black text-slate-950">
            ◈
          </div>
          <div className={`${collapsed ? "lg:hidden" : ""}`}>
            <div className="text-base font-extrabold tracking-tight text-white">CTRL+Farm</div>
            <div className="text-[10px] text-slate-500">Controle de produção</div>
          </div>
        </div>

        {/* Empresa Licenciada e Plano */}
        <div className={`mx-3 mt-3 border-b border-slate-800 pb-3 ${collapsed ? "lg:mx-2" : ""}`}>
          <p
            title={user.companyName ?? "Empresa"}
            className={`truncate rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 ${
              collapsed ? "lg:hidden" : ""
            }`}
          >
            ▰　{user.companyName ?? "Minha empresa"}
          </p>

          <div
            className={`mt-1.5 flex items-center justify-between rounded-lg border px-2.5 py-1 text-[10px] font-bold ${
              isLicensed
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                : "border-rose-500/30 bg-rose-950/40 text-rose-300"
            } ${collapsed ? "lg:hidden" : ""}`}
            title={`Plano Ativo: ${isLicensed ? planName : "Sem chave de ativação"}`}
          >
            <span className="truncate">{isLicensed ? planName : "Não Licenciado"}</span>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isLicensed ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
          </div>
        </div>

        {/* Lista de Navegação com Submenus de Abas */}
        <nav
          aria-label="Navegação principal"
          className="flex-1 space-y-1.5 overflow-y-auto px-2 py-4"
        >
          {visibleNavigation.map((item) => {
            const isCurrentPage =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`) ||
                  Boolean(
                    item.aliases?.some(
                      (alias) => pathname === alias || pathname.startsWith(`${alias}/`)
                    )
                  );

            const submenus = getSubmenusForSection(item.sectionKey);
            const hasSubmenus = submenus.length > 0;
            const open = isSectionOpen(item.href);

            return (
              <div key={item.href} className="space-y-1">
                <div className="flex items-center">
                  <Link
                    href={hasSubmenus ? `${item.href}?tab=${item.defaultTabKey || submenus[0]?.key}` : item.href}
                    onClick={onClose}
                    title={collapsed ? item.label : undefined}
                    aria-current={isCurrentPage ? "page" : undefined}
                    className={`group flex flex-1 min-h-10 items-center gap-3 rounded-xl px-3 text-[13px] transition-colors ${
                      isCurrentPage
                        ? "bg-emerald-400 font-semibold text-slate-950 shadow-md shadow-emerald-950/25"
                        : "text-slate-400 hover:bg-slate-800/75 hover:text-white"
                    } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
                  >
                    <span
                      className={`grid w-6 shrink-0 place-items-center text-base ${
                        isCurrentPage ? "text-slate-950" : "text-slate-400 group-hover:text-emerald-300"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className={`truncate flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                      {item.label}
                    </span>
                  </Link>

                  {/* Botão de Toggle de Submenu (Aparece apenas quando não colapsado e tem abas) */}
                  {hasSubmenus && !collapsed && (
                    <button
                      type="button"
                      onClick={(e) => toggleSection(item.href, e)}
                      title={open ? "Recolher abas" : "Expandir abas"}
                      className={`ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition ${
                        isCurrentPage ? "text-slate-300" : ""
                      }`}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          open ? "rotate-180 text-emerald-400" : ""
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Submenus com as Abas Correspondentes */}
                {hasSubmenus && open && !collapsed && (
                  <div className="ml-5 space-y-0.5 border-l-2 border-slate-800/90 pl-2.5 py-0.5 animate-in fade-in duration-200">
                    {submenus.map((sub) => {
                      const isSubActive =
                        isCurrentPage &&
                        (activeTabKey === sub.key || (!activeTabKey && sub.key === item.defaultTabKey));

                      return (
                        <Link
                          key={sub.key}
                          href={`${item.href}?tab=${sub.key}`}
                          onClick={onClose}
                          title={sub.label}
                          className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                            isSubActive
                              ? "bg-emerald-500/15 font-bold text-emerald-300 border-l-2 border-emerald-400"
                              : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                          }`}
                        >
                          <span className="text-sm shrink-0">{sub.icon}</span>
                          <span className="truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Rodapé: Configurações & Submenus de Configurações */}
        <div className={`border-t border-slate-800 p-3 ${collapsed ? "lg:px-2" : ""}`}>
          <div className="space-y-1">
            <div className="flex items-center">
              <Link
                href={`/settings?tab=${settingsSubmenus[0]?.key || "company"}`}
                onClick={onClose}
                title="Configurações do Sistema & Acessos"
                aria-current={pathname === "/settings" ? "page" : undefined}
                className={`flex flex-1 items-center gap-2.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                  pathname === "/settings"
                    ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 font-bold shadow-sm"
                    : "border-slate-800 bg-[#0e1726]/80 text-slate-300 hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white"
                } ${collapsed ? "lg:justify-center lg:px-0" : ""}`}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center text-emerald-400">
                  <SettingsNavIcon className="h-4.5 w-4.5" />
                </span>
                <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
                  <div className="flex items-center justify-between">
                    <span>Configurações</span>
                    {user.role === "ADMIN" && (
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </Link>

              {!collapsed && (
                <button
                  type="button"
                  onClick={(e) => toggleSection("/settings", e)}
                  title={isSectionOpen("/settings") ? "Recolher abas" : "Expandir abas"}
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isSectionOpen("/settings") ? "rotate-180 text-emerald-400" : ""
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Submenus das Abas de Configurações */}
            {!collapsed && isSectionOpen("/settings") && (
              <div className="ml-5 space-y-0.5 border-l-2 border-slate-800/90 pl-2.5 py-0.5 animate-in fade-in duration-200">
                {settingsSubmenus.map((sub) => {
                  const isSubActive =
                    pathname === "/settings" &&
                    (activeTabKey === sub.key || (!activeTabKey && sub.key === "company"));

                  return (
                    <Link
                      key={sub.key}
                      href={`/settings?tab=${sub.key}`}
                      onClick={onClose}
                      title={sub.label}
                      className={`group flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition ${
                        isSubActive
                          ? "bg-emerald-500/15 font-bold text-emerald-300 border-l-2 border-emerald-400"
                          : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                      }`}
                    >
                      <span className="text-sm shrink-0">{sub.icon}</span>
                      <span className="truncate">{sub.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className={`mt-2 mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300 ${
              collapsed ? "lg:mx-auto lg:block lg:w-fit lg:px-2" : ""
            }`}
          >
            <span>♛</span>
            <span className={collapsed ? "lg:hidden" : ""}>
              {user.role === "ADMIN"
                ? "Administrador"
                : user.role === "MANAGER"
                ? "Moderador"
                : user.role === "OPERATOR"
                ? "Operação"
                : "Padrão"}
            </span>
          </div>

          {/* Meu Perfil */}
          <Link
            href="/profile"
            onClick={onClose}
            title="Configurações do Usuário e Perfil"
            className={`group flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition hover:border-slate-700 hover:bg-slate-800/80 ${
              collapsed ? "lg:justify-center lg:px-0" : ""
            }`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-xs font-bold text-slate-950 transition group-hover:scale-105 group-hover:ring-2 group-hover:ring-emerald-400">
              {initial}
            </span>
            <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold text-white group-hover:text-emerald-300">
                  {user.name}
                </p>
                <span
                  className="text-[10px] text-slate-400 group-hover:text-emerald-300"
                  title="Configurações"
                >
                  ⚙
                </span>
              </div>
              <p className="truncate text-[10px] text-slate-400">Meu Perfil</p>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
