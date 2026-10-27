"use client";

import { useState } from "react";
import {
  UserPlus,
  Search,
  Building2,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  Clock,
  X,
  Edit,
  Trash2,
  Pause,
  Play,
  ShieldAlert,
  AlertTriangle,
  Key,
  Copy,
  Check,
  Send,
} from "lucide-react";

export function ClientsView({
  clients,
  onRefresh,
}: {
  clients: any[];
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [deletingClient, setDeletingClient] = useState<any | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  // Approval state
  const [approvingClient, setApprovingClient] = useState<any | null>(null);
  const [approvalPlan, setApprovalPlan] = useState<string>("STARTER");
  const [approvalCycle, setApprovalCycle] = useState<string>("MONTHLY");
  const [approvalSendEmail, setApprovalSendEmail] = useState<boolean>(true);
  const [approving, setApproving] = useState<boolean>(false);
  const [approvalResult, setApprovalResult] = useState<any | null>(null);
  const [keyCopied, setKeyCopied] = useState<boolean>(false);

  // Form states (Cadastro e Edição)
  const [name, setName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = (clients || []).filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        c.name.toLowerCase().includes(q) ||
        (c.tradeName || "").toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.document || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  function openCreateModal() {
    setName("");
    setTradeName("");
    setDocument("");
    setEmail("");
    setPhone("");
    setContactPerson("");
    setNotes("");
    setFormError(null);
    setIsCreateModalOpen(true);
  }

  function openEditModal(c: any) {
    setEditingClient(c);
    setName(c.name || "");
    setTradeName(c.tradeName || "");
    setDocument(c.document || "");
    setEmail(c.email || "");
    setPhone(c.phone || "");
    setContactPerson(c.contactPerson || "");
    setNotes(c.notes || "");
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch("/api/proxy/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tradeName,
          document,
          email,
          phone,
          contactPerson,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao criar cliente.");

      setIsCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClient) return;
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/proxy/clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          tradeName,
          document,
          email,
          phone,
          contactPerson,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao atualizar cliente.");

      setEditingClient(null);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || "Erro inesperado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateStatus(clientId: string, newStatus: string) {
    try {
      await fetch(`/api/proxy/clients/${clientId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient({ ...selectedClient, status: newStatus });
      }
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  }

  async function handleDelete() {
    if (!deletingClient) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/proxy/clients/${deletingClient.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Não foi possível excluir o cliente.");
      } else {
        setDeletingClient(null);
        onRefresh();
      }
    } catch (err) {
      alert("Falha ao comunicar exclusão com o servidor.");
    } finally {
      setSaving(false);
    }
  }

  const pendingCount = (clients || []).filter((c) => c.status === "PENDING").length;

  function openApproveModal(c: any) {
    setApprovingClient(c);
    setApprovalPlan("STARTER");
    setApprovalCycle("MONTHLY");
    setApprovalSendEmail(true);
    setApprovalResult(null);
    setKeyCopied(false);
  }

  async function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    if (!approvingClient) return;
    setApproving(true);
    try {
      const res = await fetch(`/api/proxy/clients/${approvingClient.id}/approve-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planCode: approvalPlan,
          billingCycle: approvalCycle,
          sendEmail: approvalSendEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao aprovar cadastro.");

      setApprovalResult(data);
      onRefresh();
    } catch (err: any) {
      alert(err.message || "Erro ao aprovar cadastro.");
    } finally {
      setApproving(false);
    }
  }

  function copyActivationKey(key: string) {
    navigator.clipboard.writeText(key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 3000);
  }

  return (
    <div className="space-y-5">
      {/* Banner de Cadastros Pendentes */}
      {pendingCount > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/25 p-4 text-xs text-amber-200 shadow-lg shadow-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">
                {pendingCount} novo(s) cadastro(s) pendente(s) originado(s) do CTRL-Farm
              </p>
              <p className="text-[11px] text-amber-300/80 mt-0.5">
                Os clientes estão na tela de bloqueio aguardando aprovação e chave de ativação. Aprove para liberar o acesso.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING")}
            className="shrink-0 rounded-xl border border-amber-500/40 bg-amber-900/50 px-3.5 py-2 font-bold text-amber-200 hover:bg-amber-800/60 transition shadow"
          >
            Filtrar Pendentes ({pendingCount})
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b263b] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>👥</span>
            <span>Gestão Completa de Clientes & Empresas</span>
          </h2>
          <p className="text-xs text-slate-400">
            Base oficial de clientes licenciados: cadastro, edição, suspensão, pausa e exclusão.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-[#00df81] px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-md shadow-emerald-500/20"
        >
          <UserPlus className="h-4 w-4" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, razão social, documento ou e-mail..."
            className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#0c1425] pl-10 pr-4 text-xs text-white placeholder-slate-500 outline-none transition focus:border-[#00df81]"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-[#233352] bg-[#0c1425] px-3 py-2 text-slate-300 outline-none"
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="PAUSED">Pausados</option>
            <option value="PENDING">Pendentes</option>
            <option value="SUSPENDED">Suspensos</option>
            <option value="CANCELLED">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#091122] text-[11px] font-semibold text-slate-400 border-b border-[#162238]">
              <tr>
                <th className="px-4 py-3">Cliente / Empresa</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Contato & E-mail</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Plano Ativo</th>
                <th className="px-4 py-3 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162238]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Nenhum cliente encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const activeSub = c.subscriptions?.[0];
                  return (
                    <tr key={c.id} className="hover:bg-[#0e172a] transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-white text-xs">{c.name}</div>
                        {c.tradeName && (
                          <div className="text-[11px] text-slate-400">{c.tradeName}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-300">
                        {c.document || "Não informado"}
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        <div className="text-slate-200">{c.email}</div>
                        {c.phone && <div className="text-slate-400">{c.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            c.status === "ACTIVE"
                              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                              : c.status === "PAUSED"
                                ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
                                : c.status === "PENDING"
                                  ? "border-amber-500/40 bg-amber-950/40 text-amber-300 animate-pulse"
                                  : "border-rose-500/30 bg-rose-950/40 text-rose-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.status === "ACTIVE"
                                ? "bg-emerald-400"
                                : c.status === "PAUSED"
                                  ? "bg-amber-400"
                                  : c.status === "PENDING"
                                    ? "bg-amber-400"
                                    : "bg-rose-400"
                            }`}
                          />
                          <span>
                            {c.status === "ACTIVE"
                              ? "ATIVO"
                              : c.status === "PAUSED"
                                ? "PAUSADO"
                                : c.status === "PENDING"
                                  ? "PENDENTE (AGUARDANDO CHAVE)"
                                  : c.status === "SUSPENDED"
                                    ? "SUSPENSO"
                                    : c.status}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {activeSub ? (
                          <span className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                            {activeSub.plan?.name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Sem plano</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botão de Aprovação Rápida para Cadastros Pendentes */}
                          {c.status === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => openApproveModal(c)}
                              title="Aprovar cadastro e emitir chave de ativação"
                              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60 transition shadow-sm"
                            >
                              <Key className="h-3.5 w-3.5 text-[#00df81]" />
                              <span>Aprovar & Gerar Chave</span>
                            </button>
                          )}

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => openEditModal(c)}
                            title="Editar dados cadastrais"
                            className="rounded-lg border border-[#233352] bg-[#091122] p-1.5 text-slate-300 hover:border-[#00df81] hover:text-[#00df81] transition"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>

                          {/* Pausar / Reativar */}
                          {c.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(c.id, "PAUSED")}
                              title="Pausar cliente temporariamente"
                              className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-1.5 text-amber-300 hover:bg-amber-900/40 transition"
                            >
                              <Pause className="h-3.5 w-3.5" />
                            </button>
                          ) : c.status === "PAUSED" || c.status === "SUSPENDED" ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(c.id, "ACTIVE")}
                              title="Reativar cliente"
                              className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-1.5 text-emerald-400 hover:bg-emerald-900/40 transition"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </button>
                          ) : null}

                          {/* Suspender */}
                          {c.status !== "SUSPENDED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(c.id, "SUSPENDED")}
                              title="Suspender cliente"
                              className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-1.5 text-rose-300 hover:bg-rose-900/40 transition"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </button>
                          )}

                          {/* Excluir */}
                          <button
                            type="button"
                            onClick={() => setDeletingClient(c)}
                            title="Excluir cliente do sistema"
                            className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-1.5 text-rose-400 hover:bg-rose-900/40 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro de Cliente */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-[#00df81]" />
                <span>Cadastrar Novo Cliente</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Razão Social ou Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Oficina 3D Pro LTDA"
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white placeholder-slate-500 outline-none focus:border-[#00df81]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="Ex: Oficina 3D"
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white placeholder-slate-500 outline-none focus:border-[#00df81]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white placeholder-slate-500 outline-none focus:border-[#00df81]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">E-mail Principal *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contato@empresa.com.br"
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white placeholder-slate-500 outline-none focus:border-[#00df81]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white placeholder-slate-500 outline-none focus:border-[#00df81]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Responsável / Contato</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Nome do operador ou proprietário"
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white placeholder-slate-500 outline-none focus:border-[#00df81]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Observações Internas</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Informações sobre volume de impressoras, contrato ou suporte..."
                  className="w-full rounded-xl border border-[#1b263b] bg-[#091122] p-2.5 text-white placeholder-slate-500 outline-none focus:border-[#00df81]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-[#233352] px-4 py-2 font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#00df81] px-5 py-2 font-bold text-slate-950 hover:bg-[#1fe28c] disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Cadastrar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Cliente */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-emerald-400" />
                <span>Editar Dados do Cliente</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Razão Social ou Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Nome Fantasia</label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">CPF ou CNPJ</label>
                  <input
                    type="text"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">E-mail Principal *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Responsável / Contato</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Observações Internas</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-[#1b263b] bg-[#091122] p-2.5 text-white outline-none focus:border-[#00df81]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="rounded-xl border border-[#233352] px-4 py-2 font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#00df81] px-5 py-2 font-bold text-slate-950 hover:bg-[#1fe28c] disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Confirmar Exclusão</h3>
            </div>
            <p className="text-xs text-slate-300">
              Tem certeza que deseja excluir o cliente{" "}
              <strong className="text-white">{deletingClient.name}</strong>?
            </p>
            <p className="text-[11px] text-slate-400">
              Esta ação removerá o registro cadastral se não houver assinaturas ativas vinculadas.
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
              <button
                type="button"
                onClick={() => setDeletingClient(null)}
                className="rounded-xl border border-[#233352] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {saving ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Aprovação e Geração de Chave */}
      {approvingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/30 bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="h-5 w-5 text-[#00df81]" />
                <span>Aprovar Cadastro & Emitir Chave de Ativação</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setApprovingClient(null);
                  setApprovalResult(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {approvalResult ? (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-emerald-300">
                  <CheckCircle2 className="h-6 w-6 shrink-0 text-[#00df81]" />
                  <div>
                    <h4 className="font-bold text-sm text-white">Chave Gerada e Cadastro Aprovado!</h4>
                    <p className="text-xs text-emerald-300/90 mt-0.5">
                      {approvalResult.emailSent
                        ? `A chave de ativação foi enviada por e-mail para ${approvingClient.email}.`
                        : "A chave foi registrada no sistema e publicada no Firebase Firestore."}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#233352] bg-[#091122] p-4 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Chave Criptográfica RSA (CTRL-Farm)
                  </span>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 px-3 py-2.5">
                    <span className="font-mono text-base font-bold text-[#00df81] tracking-wider select-all">
                      {approvalResult.activationKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyActivationKey(approvalResult.activationKey)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#233352] bg-[#0c1425] px-2.5 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:border-[#00df81] transition"
                    >
                      {keyCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{keyCopied ? "Copiado!" : "Copiar"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setApprovingClient(null);
                      setApprovalResult(null);
                    }}
                    className="rounded-xl bg-[#00df81] px-5 py-2 text-xs font-bold text-slate-950 hover:bg-[#1fe28c] transition"
                  >
                    Concluir e Fechar
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApprove} className="space-y-4 text-xs">
                <div className="rounded-xl border border-[#1b263b] bg-[#091122] p-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Empresa:</span>
                    <span className="font-bold text-white text-xs">{approvingClient.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Responsável:</span>
                    <span className="text-slate-200">{approvingClient.contactPerson || "Administrador"}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>E-mail:</span>
                    <span className="font-mono text-slate-200">{approvingClient.email}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Selecione o Plano de Licenciamento</label>
                  <select
                    value={approvalPlan}
                    onChange={(e) => setApprovalPlan(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  >
                    <option value="STARTER">Starter — 3 Impressoras, 2 Usuários (R$ 99/mês)</option>
                    <option value="PROFESSIONAL">Professional — 10 Impressoras, 5 Usuários (R$ 199/mês)</option>
                    <option value="BUSINESS">Business — 25 Impressoras, 15 Usuários + IA (R$ 399/mês)</option>
                    <option value="ENTERPRISE">Enterprise — 100 Impressoras, 50 Usuários + IA + Multi-empresa (R$ 699/mês)</option>
                    <option value="TRIAL">Trial — 15 Dias de Degustação Completa (Gratuito)</option>
                    <option value="UNLIMITED_OWNER">Unlimited Owner — Acesso Total Sem Limites (Proprietário)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Ciclo de Cobrança</label>
                  <select
                    value={approvalCycle}
                    onChange={(e) => setApprovalCycle(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  >
                    <option value="MONTHLY">Mensal (Renovação a cada 30 dias)</option>
                    <option value="QUARTERLY">Trimestral (Renovação a cada 90 dias)</option>
                    <option value="ANNUAL">Anual (Renovação a cada 365 dias)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2.5 rounded-xl border border-[#1b263b] bg-[#091122] p-3 text-slate-300">
                  <input
                    type="checkbox"
                    id="approvalSendEmail"
                    checked={approvalSendEmail}
                    onChange={(e) => setApprovalSendEmail(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-[#00df81] focus:ring-0"
                  />
                  <label htmlFor="approvalSendEmail" className="cursor-pointer text-[11px] leading-snug">
                    Enviar e-mail de confirmação automaticamente para{" "}
                    <strong className="text-white">{approvingClient.email}</strong> com a chave de ativação e instruções de desbloqueio.
                  </label>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
                  <button
                    type="button"
                    onClick={() => setApprovingClient(null)}
                    className="rounded-xl border border-[#233352] px-4 py-2 font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={approving}
                    className="flex items-center gap-2 rounded-xl bg-[#00df81] px-5 py-2 font-bold text-slate-950 hover:bg-[#1fe28c] disabled:opacity-50 shadow-md shadow-emerald-500/20"
                  >
                    <Key className="h-4 w-4" />
                    <span>{approving ? "Emitindo Chave..." : "Confirmar Aprovação & Emitir Chave"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
