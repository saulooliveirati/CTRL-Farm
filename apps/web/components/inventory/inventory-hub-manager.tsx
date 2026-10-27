"use client";

import { useState, useEffect, type FormEvent } from "react";
import { FilamentsManager } from "@/components/filaments/filaments-manager";
import { InventoryMaterialsManager } from "@/components/inventory/inventory-materials-manager";
import { ProductsManager } from "@/components/inventory/products-manager";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { InventoryMaterialRecord } from "@/lib/server-inventory-materials";
import type { ProductRecord } from "@/lib/server-products";
import type { SupplierRecord } from "@/lib/server-suppliers";
import {
  FilamentSpoolIcon,
  InsumosLayersIcon,
  ProductBox3dIcon,
} from "@/components/icons/nav-icons";
import { Archive, ChevronLeft, ChevronRight, Edit2, FolderPlus, Trash2, X } from "lucide-react";

export interface SectionTab {
  id: string;
  companyId: string;
  section: "EQUIPMENT" | "CONTACTS" | "INVENTORY";
  key: string;
  label: string;
  icon?: string | null;
  order: number;
  isDefault: boolean;
}

const TAB_PRESETS = [
  { label: "Embalagens & Caixas", key: "packaging", icon: "📦" },
  { label: "Eletrônica & Sensores", key: "electronics", icon: "🔌" },
  { label: "Parafusos & Fixadores", key: "fasteners", icon: "🔩" },
  { label: "Tintas & Primer", key: "paints", icon: "🎨" },
  { label: "Resinas Líquidas", key: "resins", icon: "🧪" },
  { label: "Peças Sobressalentes", key: "spares", icon: "⚙️" },
];

export function InventoryHubManager({
  initialFilaments = [],
  initialMaterials = [],
  initialProducts = [],
  initialSuppliers = [],
  initialFilamentError = "",
  initialMaterialError = "",
  initialProductError = "",
  currentUserRole = "ADMIN",
  defaultTab = "filaments",
}: {
  initialFilaments?: FilamentRecord[];
  initialMaterials?: InventoryMaterialRecord[];
  initialProducts?: ProductRecord[];
  initialSuppliers?: SupplierRecord[];
  initialFilamentError?: string;
  initialMaterialError?: string;
  initialProductError?: string;
  currentUserRole?: string;
  defaultTab?: string;
}) {
  const canManage =
    currentUserRole === "ADMIN" || currentUserRole === "MODERATOR" || currentUserRole === "MANAGER";

  const defaultTabs: SectionTab[] = [
    {
      id: "sys-inventory-filaments",
      companyId: "",
      section: "INVENTORY",
      key: "filaments",
      label: "Filamentos",
      icon: "filaments",
      order: 0,
      isDefault: true,
    },
    {
      id: "sys-inventory-materials",
      companyId: "",
      section: "INVENTORY",
      key: "materials",
      label: "Insumos",
      icon: "materials",
      order: 1,
      isDefault: true,
    },
    {
      id: "sys-inventory-products",
      companyId: "",
      section: "INVENTORY",
      key: "products",
      label: "Produtos",
      icon: "products",
      order: 2,
      isDefault: true,
    },
  ];

  const [tabs, setTabs] = useState<SectionTab[]>(defaultTabs);
  const [activeTabKey, setActiveTabKey] = useState(defaultTab || "filaments");

  useEffect(() => {
    if (defaultTab) {
      setActiveTabKey(defaultTab);
    }
  }, [defaultTab]);
  const [_loadingTabs, setLoadingTabs] = useState(true);
  const [errorMsg, setErrorMsg] = useState(
    initialFilamentError || initialMaterialError || initialProductError || "",
  );
  const [feedback, setFeedback] = useState("");

  // Modal de Criação de Nova Aba
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState("");
  const [newTabKey, setNewTabKey] = useState("");
  const [newTabIcon, setNewTabIcon] = useState("📦");
  const [savingTab, setSavingTab] = useState(false);

  // Modal de Edição de Aba
  const [editingTab, setEditingTab] = useState<SectionTab | null>(null);
  const [editTabLabel, setEditTabLabel] = useState("");
  const [editTabIcon, setEditTabIcon] = useState("");

  // Carrega abas customizadas da API
  useEffect(() => {
    async function loadTabs() {
      try {
        const res = await fetch("/api/section-tabs?section=INVENTORY");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.data) && json.data.length > 0) {
            setTabs(json.data);
            if (defaultTab && json.data.some((t: SectionTab) => t.key === defaultTab)) {
              setActiveTabKey(defaultTab);
            }
          }
        }
      } catch {
        // Fallback para abas padrão
      } finally {
        setLoadingTabs(false);
      }
    }
    loadTabs();
  }, [defaultTab]);

  // Sincroniza tab com URL
  const selectTab = (key: string) => {
    setActiveTabKey(key);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", key);
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("ctrlfarm:tab-selected", { detail: { key } }));
    }
  };

  // Reorganizar Abas (mover esquerda/direita)
  const moveTab = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tabs.length) return;

    const newTabs = [...tabs];
    const temp = newTabs[index]!;
    newTabs[index] = newTabs[targetIndex]!;
    newTabs[targetIndex] = temp;

    const reordered = newTabs.map((t, idx) => ({ ...t, order: idx }));
    setTabs(reordered);

    try {
      await fetch("/api/section-tabs/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "INVENTORY",
          tabIds: reordered.map((t) => t.id),
        }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch {
      // Revert em caso de erro silencioso
    }
  };

  // Criar Nova Aba Customizada
  const handleCreateTab = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTabLabel.trim()) return;

    const key =
      newTabKey.trim() ||
      newTabLabel
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "")
        .slice(0, 32);

    setSavingTab(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/section-tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "INVENTORY",
          key,
          label: newTabLabel.trim(),
          icon: newTabIcon.trim() || "📦",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Falha ao criar aba.");

      setTabs((prev) => [...prev, json.data]);
      setActiveTabKey(json.data.key);
      setShowNewTabModal(false);
      setNewTabLabel("");
      setNewTabKey("");
      setNewTabIcon("📦");
      setFeedback("Aba criada com sucesso!");
      setTimeout(() => setFeedback(""), 3500);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao criar aba.");
    } finally {
      setSavingTab(false);
    }
  };

  // Editar Aba Customizada
  const handleEditTab = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingTab || !editTabLabel.trim()) return;

    setSavingTab(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/section-tabs/${editingTab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editTabLabel.trim(),
          icon: editTabIcon.trim() || editingTab.icon,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Falha ao editar aba.");

      setTabs((prev) => prev.map((t) => (t.id === editingTab.id ? json.data : t)));
      setEditingTab(null);
      setFeedback("Aba atualizada com sucesso!");
      setTimeout(() => setFeedback(""), 3500);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar aba.");
    } finally {
      setSavingTab(false);
    }
  };

  // Excluir Aba Customizada
  const handleDeleteTab = async (tab: SectionTab) => {
    if (tab.isDefault) {
      alert("Abas principais do sistema não podem ser removidas.");
      return;
    }
    if (!confirm(`Deseja realmente excluir a aba "${tab.label}"?`)) return;

    try {
      const res = await fetch(`/api/section-tabs/${tab.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Erro ao remover aba.");
      }
      setTabs((prev) => prev.filter((t) => t.id !== tab.id));
      if (activeTabKey === tab.key) {
        setActiveTabKey("filaments");
      }
      setFeedback("Aba removida com sucesso!");
      setTimeout(() => setFeedback(""), 3500);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao remover aba.");
    }
  };

  const activeTabObj = tabs.find((t) => t.key === activeTabKey);

  return (
    <div className="space-y-6">
      {/* Toast de Feedback */}
      {feedback && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300 text-xs backdrop-blur-md animate-in fade-in">
          {feedback}
        </div>
      )}

      {/* Alerta de Erro */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-300 text-xs backdrop-blur-md">
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Barra Superior de Gestão da Categoria de Estoque */}
      {canManage && (
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">
              {activeTabObj?.icon === "filaments"
                ? "🧵"
                : activeTabObj?.icon === "materials"
                ? "📦"
                : activeTabObj?.icon === "products"
                ? "🛍️"
                : activeTabObj?.icon || "📦"}
            </span>
            <div>
              <span className="text-xs font-bold text-white">
                {activeTabObj?.key === "materials"
                  ? "Insumos"
                  : activeTabObj?.key === "products"
                  ? "Produtos"
                  : activeTabObj?.label || "Estoque"}
              </span>
              <p className="text-[10px] text-slate-400">Navegação e categorias via menu lateral</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTabObj && !activeTabObj.isDefault && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTab(activeTabObj);
                    setEditTabLabel(activeTabObj.label);
                    setEditTabIcon(activeTabObj.icon || "📦");
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
                  title="Editar aba"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Editar Aba</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTab(activeTabObj)}
                  className="flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-900/60 hover:text-white transition"
                  title="Excluir aba"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Excluir Aba</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setShowNewTabModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 transition shadow-sm"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Nova Aba de Estoque</span>
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo Renderizado da Aba Ativa */}
      <div>
        {activeTabKey === "filaments" && (
          <FilamentsManager
            initialFilaments={initialFilaments}
            initialSuppliers={initialSuppliers}
            initialError={initialFilamentError}
          />
        )}

        {activeTabKey === "materials" && (
          <InventoryMaterialsManager
            initialMaterials={initialMaterials}
            suppliers={initialSuppliers}
            initialError={initialMaterialError}
          />
        )}

        {activeTabKey === "products" && (
          <ProductsManager
            initialProducts={initialProducts}
            initialError={initialProductError}
            currentUserRole={currentUserRole}
          />
        )}

        {/* Custom Tab View */}
        {activeTabKey !== "filaments" &&
          activeTabKey !== "materials" &&
          activeTabKey !== "products" && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur-md text-center">
              <Archive className="h-12 w-12 text-cyan-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-lg font-bold text-white">
                {tabs.find((t) => t.key === activeTabKey)?.label || "Aba Personalizada"}
              </h3>
              <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
                Esta aba de estoque personalizada permite segmentar seus insumos, consumíveis ou
                produtos dedicados a esta categoria.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => selectTab("materials")}
                  className="rounded-xl border border-white/10 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                >
                  Ver Insumos Gerais
                </button>
                <button
                  type="button"
                  onClick={() => selectTab("products")}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500"
                >
                  Ver Produtos em Estoque
                </button>
              </div>
            </div>
          )}
      </div>

      {/* Modal: Nova Aba */}
      {showNewTabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Nova Aba de Estoque</h3>
                <p className="text-xs text-slate-400">
                  Crie uma categoria dedicada para organizar seu inventário 3D.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowNewTabModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTab} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Modelos Rápidos (Presets)
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {TAB_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => {
                        setNewTabLabel(preset.label);
                        setNewTabKey(preset.key);
                        setNewTabIcon(preset.icon);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-950/40 p-2 text-left text-xs text-slate-300 hover:border-cyan-500/30 hover:bg-slate-800"
                    >
                      <span>{preset.icon}</span>
                      <span className="truncate">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Aba *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Embalagens & Frete"
                  value={newTabLabel}
                  onChange={(e) => setNewTabLabel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ícone (Emoji)
                  </label>
                  <input
                    type="text"
                    value={newTabIcon}
                    onChange={(e) => setNewTabIcon(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Chave Identificadora
                  </label>
                  <input
                    type="text"
                    placeholder="Auto gerada"
                    value={newTabKey}
                    onChange={(e) => setNewTabKey(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowNewTabModal(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTab || !newTabLabel.trim()}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {savingTab ? "Criando..." : "Criar Aba"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Aba */}
      {editingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Editar Aba</h3>
                <p className="text-xs text-slate-400">Altere o nome ou ícone da aba de estoque.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTab(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditTab} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Aba *
                </label>
                <input
                  type="text"
                  required
                  value={editTabLabel}
                  onChange={(e) => setEditTabLabel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Ícone (Emoji)
                </label>
                <input
                  type="text"
                  value={editTabIcon}
                  onChange={(e) => setEditTabIcon(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTab(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTab || !editTabLabel.trim()}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {savingTab ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
