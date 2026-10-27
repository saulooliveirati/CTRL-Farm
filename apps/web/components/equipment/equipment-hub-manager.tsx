"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { PrintersManager } from "@/components/printers/printers-manager";
import { FdmPrinterIcon } from "@/components/icons/nav-icons";
import {
  getAllWikiBrands,
  getWikiModelsByBrand,
  PRINTER_WIKI_DATABASE,
} from "@/lib/equipment-wiki-database";
import type { PrinterRecord } from "@/lib/server-printers";
import type { SupplierRecord } from "@/lib/server-suppliers";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { ProductionRecord } from "@/lib/server-production";
import type { CameraRecord } from "@/lib/server-cameras";

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

export interface WorkshopEquipment {
  id: string;
  companyId: string;
  tabKey: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  status: string;
  powerWatts?: number | null;
  acquisitionDate?: string | null;
  purchasePrice?: number | null;
  hourlyCost?: number | null;
  location?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

const TAB_PRESETS = [
  { label: "Secadora de Filamento", key: "dryers", icon: "💨" },
  { label: "Impressoras de Resina (SLA/MSLA)", key: "resin", icon: "🧪" },
  { label: "Impressoras & Laser / CNC", key: "laser", icon: "⚡" },
  { label: "Lavagem & Pós-Cura", key: "wash_cure", icon: "🧼" },
  { label: "Scanners 3D", key: "scanner", icon: "🔬" },
  { label: "Outros Equipamentos", key: "others", icon: "⚙️" },
];

export function EquipmentHubManager({
  initialPrinters = [],
  initialSuppliers = [],
  initialFilaments = [],
  initialJobs = [],
  initialCameras = [],
  initialError,
  currentUserRole = "ADMIN",
  defaultTab = "printers",
}: {
  initialPrinters?: PrinterRecord[];
  initialSuppliers?: SupplierRecord[];
  initialFilaments?: FilamentRecord[];
  initialJobs?: ProductionRecord[];
  initialCameras?: CameraRecord[];
  initialError?: string;
  currentUserRole?: string;
  defaultTab?: string;
}) {
  const canManage =
    currentUserRole === "ADMIN" || currentUserRole === "MODERATOR" || currentUserRole === "MANAGER";

  const [tabs, setTabs] = useState<SectionTab[]>([
    {
      id: "sys-equipment-printers",
      companyId: "",
      section: "EQUIPMENT",
      key: "printers",
      label: "Impressoras 3D",
      icon: "fdm_printer",
      order: 0,
      isDefault: true,
    },
  ]);
  const [activeTabKey, setActiveTabKey] = useState(defaultTab || "printers");

  useEffect(() => {
    if (defaultTab) {
      setActiveTabKey(defaultTab);
    }
  }, [defaultTab]);
  const [_loadingTabs, setLoadingTabs] = useState(true);

  // Equipamentos da aba ativa (quando não for printers)
  const [equipments, setEquipments] = useState<WorkshopEquipment[]>([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [errorMsg, setErrorMsg] = useState(initialError || "");
  const [feedback, setFeedback] = useState("");

  // Modais de Aba
  const [showNewTabModal, setShowNewTabModal] = useState(false);
  const [newTabLabel, setNewTabLabel] = useState("");
  const [newTabKey, setNewTabKey] = useState("");
  const [newTabIcon, setNewTabIcon] = useState("⚙️");
  const [savingTab, setSavingTab] = useState(false);

  const [editingTab, setEditingTab] = useState<SectionTab | null>(null);
  const [editTabLabel, setEditTabLabel] = useState("");
  const [editTabIcon, setEditTabIcon] = useState("");

  // Modais de Equipamento
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEquip, setEditingEquip] = useState<WorkshopEquipment | null>(null);
  const [savingEquip, setSavingEquip] = useState(false);

  // Campos de Formulário de Equipamento
  const [formName, setFormName] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [formStatus, setFormStatus] = useState("OPERATIONAL");
  const [formPower, setFormPower] = useState("");
  const [formAcqDate, setFormAcqDate] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formHourly, setFormHourly] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formNotes, setFormNotes] = useState("");

  function showToast(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 4000);
  }

  // Carrega equipamentos da aba ativa
  const loadEquipments = useCallback(async (tabKey: string) => {
    if (tabKey === "printers") return;
    try {
      setLoadingEquipments(true);
      const res = await fetch(`/api/equipment?tabKey=${encodeURIComponent(tabKey)}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setEquipments(json.data);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar equipamentos.");
    } finally {
      setLoadingEquipments(false);
    }
  }, []);

  useEffect(() => {
    async function loadTabs() {
      try {
        const res = await fetch("/api/section-tabs?section=EQUIPMENT");
        const json = await res.json();
        if (res.ok && json.data) {
          setTabs(json.data);
        }
      } catch {
        // Mantém aba padrão
      } finally {
        setLoadingTabs(false);
      }
    }
    loadTabs();
  }, []);

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
    if (activeTabKey !== "printers") {
      loadEquipments(activeTabKey);
    }
  }, [activeTabKey, loadEquipments]);

  // Ação: Criar Nova Aba
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
          section: "EQUIPMENT",
          key: slug,
          label: newTabLabel.trim(),
          icon: newTabIcon.trim() || "⚙️",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Não foi possível criar a aba.");

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
  async function handleDeleteTab(tab: SectionTab) {
    if (tab.isDefault) return;
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a aba "${tab.label}"? Os equipamentos desta categoria serão mantidos no banco mas a aba será removida.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`/api/section-tabs/${tab.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao excluir aba.");

      setTabs((prev) => prev.filter((t) => t.id !== tab.id));
      setActiveTabKey("printers");
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
          section: "EQUIPMENT",
          items: updated.map((t) => ({ key: t.key, order: t.order })),
        }),
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("ctrlfarm:tabs-updated"));
      }
    } catch {
      // Ignora erro visual em background
    }
  }

  // Ação: Salvar Equipamento (Criar ou Editar)
  async function handleSaveEquipment(e: FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSavingEquip(true);

    try {
      const payload = {
        tabKey: activeTabKey,
        name: formName.trim(),
        brand: formBrand.trim() || undefined,
        model: formModel.trim() || undefined,
        serialNumber: formSerial.trim() || undefined,
        status: formStatus,
        powerWatts: formPower ? Number(formPower) : undefined,
        acquisitionDate: formAcqDate || undefined,
        purchasePrice: formPrice ? Number(formPrice) : undefined,
        hourlyCost: formHourly ? Number(formHourly) : undefined,
        location: formLocation.trim() || undefined,
        notes: formNotes.trim() || undefined,
      };

      if (editingEquip) {
        const res = await fetch(`/api/equipment/${editingEquip.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Erro ao atualizar equipamento.");

        setEquipments((prev) =>
          prev.map((item) => (item.id === editingEquip.id ? json.data : item)),
        );
        setEditingEquip(null);
        showToast(`Equipamento "${json.data.name}" atualizado com sucesso!`);
      } else {
        const res = await fetch("/api/equipment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message ?? "Erro ao cadastrar equipamento.");

        setEquipments((prev) => [json.data, ...prev]);
        setShowCreateModal(false);
        resetEquipForm();
        showToast(`Equipamento "${json.data.name}" cadastrado com sucesso!`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao salvar equipamento.");
    } finally {
      setSavingEquip(false);
    }
  }

  function openEditEquipModal(eq: WorkshopEquipment) {
    setEditingEquip(eq);
    setFormName(eq.name);
    setFormBrand(eq.brand ?? "");
    setFormModel(eq.model ?? "");
    setFormSerial(eq.serialNumber ?? "");
    setFormStatus(eq.status);
    setFormPower(eq.powerWatts ? String(eq.powerWatts) : "");
    setFormAcqDate(eq.acquisitionDate ? eq.acquisitionDate.slice(0, 10) : "");
    setFormPrice(eq.purchasePrice ? String(eq.purchasePrice) : "");
    setFormHourly(eq.hourlyCost ? String(eq.hourlyCost) : "");
    setFormLocation(eq.location ?? "");
    setFormNotes(eq.notes ?? "");
  }

  function resetEquipForm() {
    setEditingEquip(null);
    setFormName("");
    setFormBrand("");
    setFormModel("");
    setFormSerial("");
    setFormStatus("OPERATIONAL");
    setFormPower("");
    setFormAcqDate("");
    setFormPrice("");
    setFormHourly("");
    setFormLocation("");
    setFormNotes("");
  }

  async function handleDeleteEquipment(eq: WorkshopEquipment) {
    if (!window.confirm(`Tem certeza que deseja excluir o equipamento "${eq.name}"?`)) return;
    try {
      const res = await fetch(`/api/equipment/${eq.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Erro ao excluir equipamento.");

      setEquipments((prev) => prev.filter((item) => item.id !== eq.id));
      showToast(`Equipamento "${eq.name}" excluído com sucesso.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao excluir equipamento.");
    }
  }

  // Filtros de Equipamento
  const filteredEquipments = equipments.filter((eq) => {
    if (statusFilter !== "ALL" && eq.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = eq.name.toLowerCase().includes(q);
      const matchBrand = (eq.brand ?? "").toLowerCase().includes(q);
      const matchModel = (eq.model ?? "").toLowerCase().includes(q);
      const matchSerial = (eq.serialNumber ?? "").toLowerCase().includes(q);
      const matchLoc = (eq.location ?? "").toLowerCase().includes(q);
      return matchName || matchBrand || matchModel || matchSerial || matchLoc;
    }
    return true;
  });

  const activeTabObj = tabs.find((t) => t.key === activeTabKey);

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

      {/* Top Header Hub de Equipamentos Tecnológicos */}
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-r from-[#070c16] via-[#0b1220] to-[#101827] p-6 shadow-2xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-cyan-500/30 bg-cyan-950/40 text-2xl text-cyan-400 shadow-inner">
              ⚙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                  Equipamentos da Oficina 3D
                </h1>
                <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  Hardware & Fábrica
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Gestão unificada de impressoras 3D FDM, secadoras de filamento, resina, corte a
                laser, CNC e pós-processamento.
              </p>
            </div>
          </div>

          {/* Ações Rápidas no Cabeçalho */}
          {canManage && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNewTabLabel("");
                  setNewTabKey("");
                  setNewTabIcon("⚙️");
                  setShowNewTabModal(true);
                }}
                className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-2 text-xs font-bold text-cyan-300 transition hover:bg-cyan-900/40 hover:text-white shadow-lg shadow-cyan-950/20"
              >
                <span>＋</span>
                <span>Nova Aba de Equipamento</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Conteúdo da Aba Ativa (Navegação através dos Submenus do Menu Lateral) */}
      {activeTabKey === "printers" ? (
        // Aba 1: Impressoras 3D (Mantém 100% da implementação rica de PrintersManager)
        <PrintersManager
          initialPrinters={initialPrinters}
          initialSuppliers={initialSuppliers}
          initialFilaments={initialFilaments}
          initialJobs={initialJobs}
          initialCameras={initialCameras}
          initialError={initialError || ""}
        />
      ) : (
        // Outras Abas Customizadas de Equipamentos (Secadoras, Resina, Laser, etc.)
        <div className="space-y-5">
          {/* Header da Categoria Ativa com Controles de Gestão de Aba */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#070c16] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-xl">
                {activeTabObj?.icon || "⚙️"}
              </span>
              <div>
                <h2 className="text-base font-bold text-white">
                  {activeTabObj?.label || "Equipamento"}
                </h2>
                <p className="text-[11px] text-slate-400">
                  Gerenciando equipamentos desta categoria (navegação centralizada no menu lateral)
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
                      setEditTabIcon(activeTabObj.icon || "⚙️");
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition"
                    title="Editar nome e ícone desta aba"
                  >
                    <span>✎</span>
                    <span>Editar Aba</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTab(activeTabObj)}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 px-3 py-1.5 text-xs text-rose-300 hover:bg-rose-900/60 hover:text-white transition"
                    title="Remover esta aba"
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
                    resetEquipForm();
                    setShowCreateModal(true);
                  }}
                  className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 shadow-lg shadow-cyan-500/20"
                >
                  <span>＋</span>
                  <span>Cadastrar {activeTabObj?.label || "Equipamento"}</span>
                </button>
              )}
            </div>
          </div>

          {/* Barra de Filtros e Busca de Equipamentos */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-[#070c16] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <span className="absolute left-3 top-2.5 text-xs text-slate-500">🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Buscar em ${activeTabObj?.label || "equipamentos"}...`}
                  className="h-9 w-full rounded-xl border border-slate-700 bg-slate-900/80 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-400"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-700 bg-slate-900/80 px-3 text-xs text-slate-300 outline-none focus:border-cyan-400"
              >
                <option value="ALL">Todos os Status</option>
                <option value="OPERATIONAL">🟢 Operacional / Pronto</option>
                <option value="IN_USE">🔵 Em Operação</option>
                <option value="MAINTENANCE">🟡 Em Manutenção</option>
                <option value="STANDBY">⚪ Standby</option>
                <option value="OFFLINE">🔴 Desativado</option>
              </select>
            </div>
          </div>

          {/* Lista de Equipamentos Customizados */}
          {loadingEquipments ? (
            <div className="rounded-3xl border border-slate-800 bg-[#070c16] p-12 text-center text-xs text-slate-400">
              Carregando equipamentos de {activeTabObj?.label}...
            </div>
          ) : filteredEquipments.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-[#070c16] p-12 text-center">
              <span className="text-3xl">{activeTabObj?.icon || "⚙️"}</span>
              <h3 className="mt-2 text-sm font-bold text-white">
                Nenhum equipamento cadastrado em "{activeTabObj?.label}"
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Cadastre seus equipamentos para acompanhar potência, status operacional e custos de
                manutenção.
              </p>
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    resetEquipForm();
                    setShowCreateModal(true);
                  }}
                  className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/40 hover:text-white"
                >
                  ＋ Cadastrar Primeiro Equipamento
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEquipments.map((eq) => {
                const isOp = eq.status === "OPERATIONAL" || eq.status === "IN_USE";
                const isMaint = eq.status === "MAINTENANCE";

                return (
                  <div
                    key={eq.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-gradient-to-b from-[#0b1220] to-[#070c16] p-5 shadow-xl transition hover:border-cyan-500/40 group"
                  >
                    <div>
                      {/* Top Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-xl text-cyan-300">
                            {activeTabObj?.icon || "⚙️"}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                              {eq.name}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {eq.brand || "Oficina"} {eq.model ? `· ${eq.model}` : ""}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                            isOp
                              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300"
                              : isMaint
                                ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                                : "bg-slate-800 border-slate-700 text-slate-400"
                          }`}
                        >
                          {eq.status === "OPERATIONAL"
                            ? "Operacional"
                            : eq.status === "IN_USE"
                              ? "Em Uso"
                              : eq.status === "MAINTENANCE"
                                ? "Manutenção"
                                : eq.status === "STANDBY"
                                  ? "Standby"
                                  : "Desativado"}
                        </span>
                      </div>

                      {/* Informações Técnicas */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-2.5">
                          <span className="text-slate-500 block">Potência:</span>
                          <span className="font-semibold text-slate-200">
                            {eq.powerWatts ? `${eq.powerWatts} W` : "Não informada"}
                          </span>
                        </div>
                        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-2.5">
                          <span className="text-slate-500 block">Custo Hora:</span>
                          <span className="font-semibold text-slate-200">
                            {eq.hourlyCost
                              ? `R$ ${Number(eq.hourlyCost).toFixed(2)}/h`
                              : "R$ 0,00/h"}
                          </span>
                        </div>
                        {eq.location && (
                          <div className="col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-2.5">
                            <span className="text-slate-500 block">Localização / Bancada:</span>
                            <span className="font-semibold text-slate-200">{eq.location}</span>
                          </div>
                        )}
                        {eq.serialNumber && (
                          <div className="col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/40 p-2 text-[10px] text-slate-400 truncate">
                            Nº Série: {eq.serialNumber}
                          </div>
                        )}
                        {eq.notes && (
                          <div className="col-span-2 rounded-xl border border-slate-800/80 bg-slate-900/30 p-2.5 text-xs text-slate-300 whitespace-pre-wrap">
                            <span className="text-[10px] text-slate-500 block">Observações:</span>
                            {eq.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Botões do Card */}
                    <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
                      <button
                        type="button"
                        onClick={() => openEditEquipModal(eq)}
                        className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
                      >
                        Editar
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEquipment(eq)}
                          className="rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/40 hover:text-white"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: NOVA ABA DE EQUIPAMENTO ================= */}
      {showNewTabModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Criar Nova Aba de Equipamento</h3>
              <button
                type="button"
                onClick={() => setShowNewTabModal(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Presets Rápidos */}
            <div className="mt-4">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Sugestões Rápidas:
              </span>
              <div className="grid grid-cols-2 gap-2">
                {TAB_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setNewTabLabel(p.label);
                      setNewTabKey(p.key);
                      setNewTabIcon(p.icon);
                    }}
                    className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-left text-xs font-semibold text-slate-300 hover:border-cyan-500/40 hover:bg-cyan-950/20 hover:text-cyan-300 transition"
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
                  placeholder="Ex.: Secadora de Filamento"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-2">
                <label className="font-semibold text-slate-300">
                  Ícone (Emoji)
                  <input
                    value={newTabIcon}
                    onChange={(e) => setNewTabIcon(e.target.value)}
                    placeholder="Ex.: 💨"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400 text-center text-base"
                  />
                </label>

                <label className="font-semibold text-slate-300">
                  Identificador Único
                  <input
                    value={newTabKey}
                    onChange={(e) => setNewTabKey(e.target.value)}
                    placeholder="dryers"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
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
                  className="rounded-xl bg-cyan-500 px-5 py-2 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {savingTab ? "Criando..." : "Criar Aba"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR ABA ================= */}
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
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <label className="block font-semibold text-slate-300">
                Ícone (Emoji)
                <input
                  value={editTabIcon}
                  onChange={(e) => setEditTabIcon(e.target.value)}
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400 text-center text-base"
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
                  className="rounded-xl bg-cyan-500 px-5 py-2 font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CADASTRO / EDIÇÃO DE EQUIPAMENTO ================= */}
      {(showCreateModal || editingEquip) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingEquip
                  ? `Editar ${editingEquip.name}`
                  : `Cadastrar Equipamento em "${activeTabObj?.label}"`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEquip(null);
                }}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="mt-4 space-y-3.5 text-xs">
              <label className="block font-semibold text-slate-300">
                Nome do Equipamento *
                <input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex.: Sunlu S2 Secadora Pro"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-slate-300">
                  Marca / Fabricante
                  <input
                    list="wiki-brands-datalist"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="Ex.: Bambu Lab, Creality, Sunlu…"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  />
                  <datalist id="wiki-brands-datalist">
                    {getAllWikiBrands().map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </label>
                <label className="font-semibold text-slate-300">
                  Modelo
                  <input
                    list="wiki-models-datalist"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    placeholder="Ex.: X1-Carbon, K1C, Ender-3…"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  />
                  <datalist id="wiki-models-datalist">
                    {(formBrand ? getWikiModelsByBrand(formBrand) : PRINTER_WIKI_DATABASE).map(
                      (m) => (
                        <option key={m.id} value={m.model}>
                          {m.brand} {m.model} ({m.technology})
                        </option>
                      ),
                    )}
                  </datalist>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-slate-300">
                  Status Operacional
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  >
                    <option value="OPERATIONAL">🟢 Operacional / Pronto</option>
                    <option value="IN_USE">🔵 Em Operação</option>
                    <option value="MAINTENANCE">🟡 Em Manutenção</option>
                    <option value="STANDBY">⚪ Standby</option>
                    <option value="OFFLINE">🔴 Desativado</option>
                  </select>
                </label>
                <label className="font-semibold text-slate-300">
                  Potência Elétrica (Watts)
                  <input
                    type="number"
                    value={formPower}
                    onChange={(e) => setFormPower(e.target.value)}
                    placeholder="Ex.: 48"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-slate-300">
                  Custo Hora Estimado (R$/h)
                  <input
                    type="number"
                    step="0.01"
                    value={formHourly}
                    onChange={(e) => setFormHourly(e.target.value)}
                    placeholder="Ex.: 0.50"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="font-semibold text-slate-300">
                  Preço de Compra (R$)
                  <input
                    type="number"
                    step="0.01"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Ex.: 350.00"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="font-semibold text-slate-300">
                  Localização / Bancada
                  <input
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="Ex.: Bancada 2 - Pós-processo"
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>
                <label className="font-semibold text-slate-300">
                  Data de Aquisição
                  <input
                    type="date"
                    value={formAcqDate}
                    onChange={(e) => setFormAcqDate(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                  />
                </label>
              </div>

              <label className="block font-semibold text-slate-300">
                Número de Série / Código Patrimônio
                <input
                  value={formSerial}
                  onChange={(e) => setFormSerial(e.target.value)}
                  placeholder="Ex.: SN-2026-X99"
                  className="mt-1 h-9 w-full rounded-xl border border-slate-700 bg-[#070c16] px-3 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <label className="block font-semibold text-slate-300">
                Observações / Histórico de Manutenção
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Anotações técnicas, trocas de filtro, limpeza, etc..."
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-[#070c16] p-3 text-white outline-none focus:border-cyan-400"
                />
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingEquip(null);
                  }}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEquip}
                  className="rounded-xl bg-cyan-500 px-5 py-2 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  {savingEquip ? "Salvando..." : editingEquip ? "Atualizar" : "Cadastrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
