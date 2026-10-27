"use client";

import { useState } from "react";
import {
  CreditCard,
  Plus,
  RefreshCw,
  X,
  AlertCircle,
  Edit,
  Trash2,
  Pause,
  Play,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function SubscriptionsView({
  subscriptions,
  clients,
  plans,
  onRefresh,
}: {
  subscriptions: any[];
  clients: any[];
  plans: any[];
  onRefresh: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<any | null>(null);
  const [deletingSub, setDeletingSub] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states - Criação
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [customPrice, setCustomPrice] = useState("");

  // Form states - Edição
  const [editPlanId, setEditPlanId] = useState("");
  const [editBillingCycle, setEditBillingCycle] = useState("MONTHLY");
  const [editPaymentMethod, setEditPaymentMethod] = useState("PIX");
  const [editPrice, setEditPrice] = useState("");
  const [editNextBilling, setEditNextBilling] = useState("");

  const filtered = (subscriptions || []).filter((s) => {
    if (statusFilter !== "ALL" && s.status !== statusFilter) return false;
    return true;
  });

  function openCreateModal() {
    setClientId(clients[0]?.id || "");
    setPlanId(plans[0]?.id || "");
    setBillingCycle("MONTHLY");
    setPaymentMethod("PIX");
    setCustomPrice("");
    setError(null);
    setIsCreateModalOpen(true);
  }

  function openEditModal(sub: any) {
    setEditingSub(sub);
    setEditPlanId(sub.planId || "");
    setEditBillingCycle(sub.billingCycle || "MONTHLY");
    setEditPaymentMethod(sub.paymentMethod || "PIX");
    setEditPrice(String(sub.currentPrice || ""));
    setEditNextBilling(
      sub.nextBillingDate ? new Date(sub.nextBillingDate).toISOString().split("T")[0] : ""
    );
    setError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/proxy/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          planId,
          billingCycle,
          paymentMethod,
          currentPrice: customPrice ? Number(customPrice) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao criar assinatura.");

      setIsCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSub) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/proxy/subscriptions/${editingSub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: editPlanId,
          billingCycle: editBillingCycle,
          paymentMethod: editPaymentMethod,
          currentPrice: editPrice ? Number(editPrice) : undefined,
          nextBillingDate: editNextBilling ? new Date(editNextBilling).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao atualizar assinatura.");

      setEditingSub(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRenew(id: string) {
    try {
      await fetch(`/api/proxy/subscriptions/${id}/renew`, {
        method: "POST",
      });
      onRefresh();
    } catch (err) {
      console.error("Erro na renovação:", err);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      await fetch(`/api/proxy/subscriptions/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
    }
  }

  async function handleDelete() {
    if (!deletingSub) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/subscriptions/${deletingSub.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Falha ao excluir assinatura.");
      } else {
        setDeletingSub(null);
        onRefresh();
      }
    } catch (err) {
      alert("Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b263b] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>💳</span>
            <span>Controle Comercial de Assinaturas</span>
          </h2>
          <p className="text-xs text-slate-400">
            Cadastrar, editar ciclos, valores, suspender, pausar e excluir planos contratados.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-xl bg-[#00df81] px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-md shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Assinatura</span>
        </button>
      </div>

      {/* Filtro por Status */}
      <div className="flex items-center gap-2 text-xs">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-[#233352] bg-[#0c1425] px-3 py-2 text-slate-300 outline-none"
        >
          <option value="ALL">Todos os status</option>
          <option value="ATIVO">Ativas</option>
          <option value="PAUSADO">Pausadas</option>
          <option value="PENDENTE">Pendentes</option>
          <option value="SUSPENSO">Suspensas</option>
          <option value="CANCELADO">Canceladas</option>
          <option value="EXPIRADO">Expiradas</option>
        </select>
      </div>

      {/* Tabela de Assinaturas */}
      <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#091122] text-[11px] font-semibold text-slate-400 border-b border-[#162238]">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Ciclo & Pagamento</th>
                <th className="px-4 py-3">Valor Cobrado</th>
                <th className="px-4 py-3">Próximo Vencimento</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162238]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma assinatura registrada.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-[#0e172a] transition">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-xs">{s.client?.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{s.client?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-200">{s.plan?.name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                          {s.billingCycle === "MONTHLY"
                            ? "Mensal"
                            : s.billingCycle === "QUARTERLY"
                              ? "Trimestral"
                              : "Anual"}
                        </span>
                        <span className="rounded-md border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                          {s.paymentMethod || "PIX"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                      {currencyFormatter.format(Number(s.currentPrice))}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {new Date(s.nextBillingDate).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          s.status === "ATIVO"
                            ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                            : s.status === "PAUSADO"
                              ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
                              : s.status === "PENDENTE"
                                ? "border-blue-500/30 bg-blue-950/40 text-blue-400"
                                : s.status === "SUSPENSO"
                                  ? "border-purple-500/30 bg-purple-950/40 text-purple-300"
                                  : "border-rose-500/30 bg-rose-950/40 text-rose-400"
                        }`}
                      >
                        <span>{s.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Renovar */}
                        <button
                          type="button"
                          onClick={() => handleRenew(s.id)}
                          title="Renovar próximo vencimento"
                          className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-1.5 text-emerald-400 hover:bg-emerald-900/40 transition"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => openEditModal(s)}
                          title="Editar assinatura"
                          className="rounded-lg border border-[#233352] bg-[#091122] p-1.5 text-slate-300 hover:border-[#00df81] hover:text-[#00df81] transition"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        {/* Pausar / Reativar */}
                        {s.status === "ATIVO" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, "PAUSADO")}
                            title="Pausar assinatura"
                            className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-1.5 text-amber-300 hover:bg-amber-900/40 transition"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                        ) : s.status === "PAUSADO" || s.status === "SUSPENSO" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, "ATIVO")}
                            title="Reativar assinatura"
                            className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-1.5 text-emerald-400 hover:bg-emerald-900/40 transition"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        ) : null}

                        {/* Suspender */}
                        {s.status !== "SUSPENSO" && (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(s.id, "SUSPENSO")}
                            title="Suspender assinatura"
                            className="rounded-lg border border-purple-500/30 bg-purple-950/20 p-1.5 text-purple-300 hover:bg-purple-900/40 transition"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => setDeletingSub(s)}
                          title="Excluir assinatura"
                          className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-1.5 text-rose-400 hover:bg-rose-900/40 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação de Assinatura */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#00df81]" />
                <span>Nova Assinatura Comercial</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Cliente *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Plano Contratado *</label>
                <select
                  required
                  value={planId}
                  onChange={(e) => setPlanId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {currencyFormatter.format(Number(p.monthlyPrice))}/mês
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Ciclo de Cobrança</label>
                  <select
                    value={billingCycle}
                    onChange={(e) => setBillingCycle(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Forma de Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  >
                    <option value="PIX">PIX</option>
                    <option value="CARTAO">Cartão de Crédito</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="BOLETO">Boleto Bancário</option>
                    <option value="CORTESIA">Cortesia / Bonificado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Preço Customizado (opcional, deixa em branco para usar valor do plano)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="Ex: 29.90"
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
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
                  disabled={loading}
                  className="rounded-xl bg-[#00df81] px-5 py-2 font-bold text-slate-950 hover:bg-[#1fe28c] disabled:opacity-50"
                >
                  {loading ? "Criando..." : "Confirmar Assinatura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição de Assinatura */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-emerald-400" />
                <span>Editar Assinatura</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
                {error}
              </div>
            )}

            <form onSubmit={handleEdit} className="space-y-3.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Cliente</span>
                <strong className="text-white text-sm">{editingSub.client?.name}</strong>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Plano</label>
                <select
                  value={editPlanId}
                  onChange={(e) => setEditPlanId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {currencyFormatter.format(Number(p.monthlyPrice))}/mês
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Ciclo</label>
                  <select
                    value={editBillingCycle}
                    onChange={(e) => setEditBillingCycle(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  >
                    <option value="MONTHLY">Mensal</option>
                    <option value="QUARTERLY">Trimestral</option>
                    <option value="ANNUAL">Anual</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Forma de Pagamento</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  >
                    <option value="PIX">PIX</option>
                    <option value="CARTAO">Cartão de Crédito</option>
                    <option value="DEBITO">Cartão de Débito</option>
                    <option value="BOLETO">Boleto</option>
                    <option value="CORTESIA">Cortesia</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Valor Cobrado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Próximo Vencimento</label>
                  <input
                    type="date"
                    value={editNextBilling}
                    onChange={(e) => setEditNextBilling(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
                <button
                  type="button"
                  onClick={() => setEditingSub(null)}
                  className="rounded-xl border border-[#233352] px-4 py-2 font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[#00df81] px-5 py-2 font-bold text-slate-950 hover:bg-[#1fe28c] disabled:opacity-50"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deletingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Excluir Assinatura</h3>
            </div>
            <p className="text-xs text-slate-300">
              Deseja remover permanentemente a assinatura do cliente{" "}
              <strong className="text-white">{deletingSub.client?.name}</strong>?
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
              <button
                type="button"
                onClick={() => setDeletingSub(null)}
                className="rounded-xl border border-[#233352] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleDelete}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {loading ? "Excluindo..." : "Confirmar Exclusão"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
