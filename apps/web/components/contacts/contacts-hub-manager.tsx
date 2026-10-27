"use client";

import { useState, useEffect, type FormEvent } from "react";
import { CustomersManager } from "@/components/customers/customers-manager";
import { SuppliersManager } from "@/components/suppliers/suppliers-manager";
import { CustomersTabIcon, SuppliersTruckIcon } from "@/components/icons/nav-icons";
import type { CustomerRecord } from "@/lib/server-customers";
import type { SupplierRecord } from "@/lib/server-suppliers";

export interface ContactTab {
  id: string;
  companyId: string;
  section: "CONTACTS";
  key: string;
  label: string;
  icon?: string | null;
  order: number;
  isDefault: boolean;
}

export interface CustomContactItem {
  id: string;
  tabKey: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  category?: string;
  address?: string;
  notes?: string;
}

const CONTACT_PRESETS = [
  { label: "Parceiros Comerciais", key: "partners", icon: "🤝" },
  { label: "Assistência Técnica & Manutenção", key: "tech_support", icon: "🔧" },
  { label: "Transportadoras & Logística", key: "shipping", icon: "🚚" },
  { label: "Prestadores de Serviços", key: "service_providers", icon: "🏢" },
  { label: "Outros Contatos", key: "others", icon: "📇" },
];

export function ContactsHubManager({
  initialCustomers = [],
  initialSuppliers = [],
  initialCustomerError,
  initialSupplierError,
  currentUserRole = "ADMIN",
  defaultTab = "customers",
}: {
  initialCustomers?: CustomerRecord[];
  initialSuppliers?: SupplierRecord[];
  initialCustomerError?: string;
  initialSupplierError?: string;
  currentUserRole?: string;
  defaultTab?: string;
}) {
  const canManage =
    currentUserRole === "ADMIN" || currentUserRole === "MODERATOR" || currentUserRole === "MANAGER";

  const [tabs, setTabs] = useState<ContactTab[]>([
    {
      id: "sys-contacts-customers",
      companyId: "",
      section: "CONTACTS",
      key: "customers",
      label: "Clientes",
      icon: "customers",
      order: 0,
      isDefault: true,
    },
    {
      id: "sys-contacts-suppliers",
      companyId: "",
      section: "CONTACTS",
      key: "suppliers",
      label: "Fornecedores",
      icon: "suppliers",
      order: 1,
      isDefault: true,
    },
  ]);
  const [activeTabKey, setActiveTabKey] = useState(defaultTab);

  const selectTab = (key: string) => {
    setActiveTabKey(key);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", key);
      window.history.replaceState({}, "", url.toString());
      window.dispatchEvent(new CustomEvent("ctrlfarm:tab-selected", { detail: { key } }));
    }
  };

  useEffect(() => {
    if (defaultTab) {
      setActiveTabKey(defaultTab);
    }
  }, [defaultTab]);
  const [feedback, setFeedback] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Modais de Aba
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState("");
  const [newTabKey, setNewTabKey] = useState("");
  const [newTabIcon, setNewTabIcon] = useState("📇");
  const [savingTab, setSavingTab] = useState(false);

  const [editingTab, setEditingTab] = useState<ContactTab | null>(null);
  const [editTabLabel, setEditTabLabel] = useState("");
  const [editTabIcon, setEditTabIcon] = useState("");

  // Contatos de abas customizadas (armazenados localmente ou via fornecedor com tag de categoria)
  const [customContacts, setCustomContacts] = useState<CustomContactItem[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<CustomContactItem | null>(null);

  const [formName, setFormName] = useState("");
  const [formDoc, setFormDoc] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [search, setSearch] = useState("");

  function showToast(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  }

  useEffect(() => {
    async function loadTabs() {
      try {
        const res = await fetch("/api/section-tabs?section=CONTACTS");
        const json = await res.json();
        if (res.ok && json.data) {
          setTabs(json.data);
        }
      } catch {
        // Mantém padrões
      }
    }

    loadTabs();
    // Carrega contatos customizados salvos localmente
    const saved = localStorage.getItem("ctrlfarm_custom_contacts");
    if (saved) {
      try {
        setCustomContacts(JSON.parse(saved));
      } catch {
        // Ignora
      }
    }
  }, []);

  function persistCustomContacts(updated: CustomContactItem[]) {
    setCustomContacts(updated);
    localStorage.setItem("ctrlfarm_custom_contacts", JSON.stringify(updated));
  }

  // Ação: Criar Aba Customizada
  async function handleCreateTab(e: FormEvent) {
    e.preventDefault();
    if (!newTabLabel.trim()) return;
    setSavingTab(true);
    try {
      const slug =
        newTabKey.trim() ||
        newTabLabel
          .toLowerCase()
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, "_")
          .replace(/_+/g, "_")
          .replace(/^_|_$/g, "");

      const res = await fetch("/api/section-tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "CONTACTS",
          key: slug,
          label: newTabLabel.trim(),
          icon: newTabIcon.trim() || "📇",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao criar aba.");

      setTabs((prev) => [...prev, json.data]);
      selectTab(json.data.key);
      setShowNewTabModal(false);
      setNewTabLabel("");
      setNewTabKey("");
      showToast(`Aba "${json.data.label}" adicionada com sucesso!`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao criar aba.");
    } finally {
      setSavingTab(false);
    }
  }

  // Ação: Salvar Edição da Aba
  async function handleSaveEditTab(e: FormEvent) {
    e.preventDefault();
    if (!editingTab) return;
    setSavingTab(true);
    try {
      const res = await fetch(`/api/section-tabs/${editingTab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: editTabLabel.trim(),
          icon: editTabIcon.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao atualizar aba.");

      setTabs((prev) => prev.map((t) => (t.id === editingTab.id ? json.data : t)));
      setEditingTab(null);
      showToast("Aba atualizada com sucesso!");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao atualizar aba.");
    } finally {
      setSavingTab(false);
    }
  }

  // Ação: Excluir Aba Customizada
  async function handleDeleteTab(tab: ContactTab) {
    if (tab.isDefault) return;
    if (!window.confirm(`Tem certeza que deseja excluir a aba "${tab.label}"?`)) return;

    try {
      const res = await fetch(`/api/section-tabs/${tab.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao excluir aba.");

      setTabs((prev) => prev.filter((t) => t.id !== tab.id));
      setActiveTabKey("customers");
      showToast(`Aba "${tab.label}" excluída com sucesso.`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao excluir aba.");
    }
  }

  // Ação: Reordenar Abas
  async function handleMoveTab(index: number, direction: "left" | "right") {
    const targetIdx = direction === "left" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= tabs.length) return;

    const newTabs = [...tabs];
    const temp = newTabs[index]!;
    newTabs[index] = newTabs[targetIdx]!;
    newTabs[targetIdx] = temp;

    const updated = newTabs.map((t, idx) => ({ ...t, order: idx }));
    setTabs(updated);

    try {
      await fetch("/api/section-tabs/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "CONTACTS",
          items: updated.map((t) => ({ key: t.key, order: t.order })),
        }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch {
      // Ignora erro de rede em background
    }
  }

  // Ação: Salvar Contato Customizado
  function handleSaveCustomContact(e: FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingContact) {
      const updated = customContacts.map((c) =>
        c.id === editingContact.id
          ? {
              ...c,
              name: formName.trim(),
              document: formDoc.trim() || undefined,
              phone: formPhone.trim() || undefined,
              email: formEmail.trim() || undefined,
              category: formCategory.trim() || undefined,
              address: formAddress.trim() || undefined,
              notes: formNotes.trim() || undefined,
            }
          : c,
      );
      persistCustomContacts(updated);
      setEditingContact(null);
      showToast(`Contato "${formName}" atualizado com sucesso!`);
    } else {
      const newContact: CustomContactItem = {
        id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        tabKey: activeTabKey,
        name: formName.trim(),
        document: formDoc.trim() || undefined,
        phone: formPhone.trim() || undefined,
        email: formEmail.trim() || undefined,
        category: formCategory.trim() || undefined,
        address: formAddress.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };
      persistCustomContacts([newContact, ...customContacts]);
      setShowContactModal(false);
      resetContactForm();
      showToast(`Contato "${newContact.name}" cadastrado com sucesso!`);
    }
  }

  function resetContactForm() {
    setEditingContact(null);
    setFormName("");
    setFormDoc("");
    setFormPhone("");
    setFormEmail("");
    setFormCategory("");
    setFormAddress("");
    setFormNotes("");
  }

  function openEditContact(c: CustomContactItem) {
    setEditingContact(c);
    setFormName(c.name);
    setFormDoc(c.document ?? "");
    setFormPhone(c.phone ?? "");
    setFormEmail(c.email ?? "");
    setFormCategory(c.category ?? "");
    setFormAddress(c.address ?? "");
    setFormNotes(c.notes ?? "");
  }

  function handleDeleteCustomContact(c: CustomContactItem) {
    if (!window.confirm(`Tem certeza que deseja excluir o contato "${c.name}"?`)) return;
    persistCustomContacts(customContacts.filter((item) => item.id !== c.id));
    showToast(`Contato "${c.name}" excluído.`);
  }

  const activeTabObj = tabs.find((t) => t.key === activeTabKey);
  const currentTabContacts = customContacts.filter((c) => {
    if (c.tabKey !== activeTabKey) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.document ?? "").toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 px-4 py-3 text-xs font-semibold text-emerald-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <span>✓</span>
          <span>{feedback}</span>
        </div>
      )}

      {/* Erro Banner */}
      {errorMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">
          <span>⚠ {errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg("")}
            className="text-rose-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Unificado da Central de Contatos */}
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-r from-[#070c16] via-[#0b1220] to-[#101827] p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-emerald-500/30 bg-emerald-950/40 text-2xl text-emerald-400 shadow-inner">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                  Central de Contatos
                </h1>
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Cadastros Unificados
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Gestão centralizada de clientes, fornecedores de filamentos e parceiros comerciais
                separados por abas dedicadas.
              </p>
            </div>
          </div>

          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewTabLabel("");
                  setNewTabKey("");
                  setNewTabIcon("📇");
                  setShowNewTabModal(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-900/40 hover:text-white shadow-lg shadow-emerald-950/20"
              >
                <span>＋</span>
                <span>Nova Aba de Contato</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo da Aba Ativa (Navegação através dos Submenus do Menu Lateral) */}
      {activeTabKey === "customers" ? (
        // Aba 1: Clientes (Controle completo de CustomersManager)
        <CustomersManager
          initialCustomers={initialCustomers}
          initialError={initialCustomerError || ""}
        />
      ) : activeTabKey === "suppliers" ? (
        // Aba 2: Fornecedores (Controle completo de SuppliersManager)
        <SuppliersManager
          initialSuppliers={initialSuppliers}
          initialError={initialSupplierError || ""}
        />
      ) : (
        // Abas Customizadas (Parceiros, Assistência, Transportadoras)
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#070c16] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xl">
                {activeTabObj?.icon || "📇"}
              </span>
              <div>
                <h2 className="text-base font-bold text-white">
                  {activeTabObj?.label || "Contatos"}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Gerenciando contatos desta categoria (navegação centralizada no menu lateral)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {canManage && activeTabObj && !activeTabObj.isDefault && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingTab(activeTabObj);
                      setEditTabLabel(activeTabObj.label);
                      setEditTabIcon(activeTabObj.icon || "📇");
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
                    title="Editar aba"
                  >
                    <span>✎</span>
                    <span>Editar Aba</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTab(activeTabObj)}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-900/60 hover:text-white transition"
                    title="Excluir aba"
                  >
                    <span>✕</span>
                    <span>Excluir Aba</span>
                  </button>
                </>
              )}

              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    resetContactForm();
                    setShowContactModal(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-300 shadow-lg shadow-emerald-500/20"
                >
                  <span>＋</span>
                  <span>Cadastrar em {activeTabObj?.label || "Contatos"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#070c16] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Buscar em ${activeTabObj?.label || "contatos"}...`}
                className="h-9 w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {currentTabContacts.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-[#070c16] p-12 text-center">
              <span className="text-3xl">{activeTabObj?.icon || "📇"}</span>
              <h3 className="mt-2 text-sm font-bold text-white">
                Nenhum registro em "{activeTabObj?.label}"
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Adicione contatos para organizar parceiros, fornecedores de frete ou assistência
                técnica.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    resetContactForm();
                    setShowContactModal(true);
                  }}
                  className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 hover:text-white"
                >
                  ＋ Cadastrar Primeiro Contato
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {currentTabContacts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0b1220] p-5 shadow-xl transition hover:border-emerald-500/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xl text-emerald-300">
                          {activeTabObj?.icon || "📇"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{c.name}</h4>
                          {c.category && (
                            <span className="text-[10px] text-emerald-400 font-semibold">
                              {c.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-300">
                      {c.phone && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <span>📞</span>
                          <span>{c.phone}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <span>✉</span>
                          <span className="truncate">{c.email}</span>
                        </div>
                      )}
                      {c.document && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>🆔</span>
                          <span>{c.document}</span>
                        </div>
                      )}
                      {c.address && (
                        <div className="text-[11px] text-slate-400 pt-1">📍 {c.address}</div>
                      )}
                      {c.notes && (
                        <div className="mt-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-2.5 text-slate-300 whitespace-pre-wrap text-[11px]">
                          {c.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
                    <button
                      type="button"
                      onClick={() => openEditContact(c)}
                      className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                    >
                      Editar
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomContact(c)}
                        className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 hover:text-white"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: NOVA ABA DE CONTATOS ================= */}
      {showNewTabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Criar Nova Aba de Contatos</h3>
              <button
                type="button"
                onClick={() => setShowNewTabModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Sugestões Rápidas:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {CONTACT_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setNewTabLabel(p.label);
                      setNewTabKey(p.key);
                      setNewTabIcon(p.icon);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-left text-xs font-semibold text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-950/20 hover:text-emerald-300 transition"
                  >
                    <span>{p.icon}</span>
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateTab} className="mt-4 space-y-3 text-xs">
              <label className="block font-semibold text-slate-300">
                Nome da Aba *
                <input
                  required
                  value={newTabLabel}
                  onChange={(e) => setNewTabLabel(e.target.value)}
                  placeholder="Ex.: Transportadoras"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="font-semibold text-slate-300">
                  Ícone (Emoji)
                  <input
                    value={newTabIcon}
                    onChange={(e) => setNewTabIcon(e.target.value)}
                    placeholder="Ex.: 🚚"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400 text-center text-base"
                  />
                </label>
                <label className="font-semibold text-slate-300">
                  Identificador Único
                  <input
                    value={newTabKey}
                    onChange={(e) => setNewTabKey(e.target.value)}
                    placeholder="shipping"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewTabModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTab}
                  className="rounded-xl bg-emerald-400 px-5 py-2 font-bold text-slate-950 hover:bg-emerald-300 disabled:opacity-50"
                >
                  {savingTab ? "Criando..." : "Criar Aba"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR ABA DE CONTATOS ================= */}
      {editingTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
              Editar Aba "{editingTab.label}"
            </h3>
            <form onSubmit={handleSaveEditTab} className="mt-4 space-y-3 text-xs">
              <label className="block font-semibold text-slate-300">
                Nome da Aba
                <input
                  required
                  value={editTabLabel}
                  onChange={(e) => setEditTabLabel(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block font-semibold text-slate-300">
                Ícone (Emoji)
                <input
                  value={editTabIcon}
                  onChange={(e) => setEditTabIcon(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400 text-center text-base"
                />
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTab(null)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTab}
                  className="rounded-xl bg-emerald-400 px-5 py-2 font-bold text-slate-950 hover:bg-emerald-300"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CADASTRO / EDIÇÃO DE CONTATO ================= */}
      {(showContactModal || editingContact) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingContact ? `Editar Contato` : `Novo Contato em "${activeTabObj?.label}"`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowContactModal(false);
                  setEditingContact(null);
                }}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomContact} className="mt-4 space-y-3 text-xs">
              <label className="block font-semibold text-slate-300">
                Nome do Contato / Empresa *
                <input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex.: Jadlog Express / Eletro 3D Reparos"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="font-semibold text-slate-300">
                  CPF / CNPJ
                  <input
                    value={formDoc}
                    onChange={(e) => setFormDoc(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="font-semibold text-slate-300">
                  Categoria / Serviço
                  <input
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="Ex.: Envio Sedex / Manutenção"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="font-semibold text-slate-300">
                  Telefone / WhatsApp
                  <input
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
                <label className="font-semibold text-slate-300">
                  E-mail
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="contato@empresa.com"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                  />
                </label>
              </div>

              <label className="block font-semibold text-slate-300">
                Endereço
                <input
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Rua, Número, Cidade - UF"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block font-semibold text-slate-300">
                Observações
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Condições comerciais, prazos, contatos adicionais..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#070c16] p-2.5 text-white outline-none focus:border-emerald-400"
                />
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowContactModal(false);
                    setEditingContact(null);
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-400 px-5 py-2 font-bold text-slate-950 hover:bg-emerald-300"
                >
                  {editingContact ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
