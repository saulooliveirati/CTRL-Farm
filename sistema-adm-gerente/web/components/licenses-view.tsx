"use client";

import { useState } from "react";
import {
  Key,
  Shield,
  Copy,
  Check,
  Download,
  Search,
  X,
  AlertTriangle,
  Lock,
  Sparkles,
  Edit,
  Trash2,
  Pause,
  Play,
  ShieldAlert,
} from "lucide-react";

export function LicensesView({
  licenses,
  clients,
  plans,
  subscriptions = [],
  isGenerateModalOpen,
  setIsGenerateModalOpen,
  onRefresh,
}: {
  licenses: any[];
  clients: any[];
  plans: any[];
  subscriptions?: any[];
  isGenerateModalOpen: boolean;
  setIsGenerateModalOpen: (open: boolean) => void;
  onRefresh: () => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form states - Geração
  const [clientId, setClientId] = useState(clients[0]?.id || "");
  const [planId, setPlanId] = useState(plans[0]?.id || "");
  const [validityDays, setValidityDays] = useState("365");
  const [subscriptionOption, setSubscriptionOption] = useState("NEW");
  const [billingCycle, setBillingCycle] = useState("MONTHLY");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLicense, setGeneratedLicense] = useState<any | null>(null);

  // Form states - Edição
  const [editingLicense, setEditingLicense] = useState<any | null>(null);
  const [editDaysToAdd, setEditDaysToAdd] = useState("30");
  const [editFeatures, setEditFeatures] = useState<string[]>([]);

  // Exclusão
  const [deletingLicense, setDeletingLicense] = useState<any | null>(null);

  // Revoke modal
  const [revokeModalOpen, setRevokeModalOpen] = useState(false);
  const [targetLicenseId, setTargetLicenseId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  const filtered = (licenses || []).filter((l) => {
    if (statusFilter !== "ALL" && l.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        l.activationKey.toLowerCase().includes(q) ||
        (l.client?.name || "").toLowerCase().includes(q) ||
        (l.plan?.name || "").toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const days = Number(validityDays);
      const payload: any = {
        clientId,
        planId,
        validityDays: days > 0 ? days : 365,
      };

      if (subscriptionOption === "NEW") {
        payload.billingCycle = billingCycle;
        payload.paymentMethod = paymentMethod;
      } else {
        payload.subscriptionId = subscriptionOption;
      }

      const res = await fetch("/api/proxy/licenses/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao gerar licença.");

      setGeneratedLicense(data);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Erro ao processar chave.");
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(lic: any) {
    setEditingLicense(lic);
    setEditDaysToAdd("30");
    const existingFeatures = Array.isArray(lic.allowedFeatures)
      ? lic.allowedFeatures
      : lic.allowedFeatures?.modules || [];
    setEditFeatures(existingFeatures);
    setError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLicense) return;
    setLoading(true);
    setError(null);

    try {
      const currentExpiry = new Date(editingLicense.expiresAt);
      const days = Number(editDaysToAdd) || 0;
      currentExpiry.setDate(currentExpiry.getDate() + days);

      const res = await fetch(`/api/proxy/licenses/${editingLicense.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expiresAt: currentExpiry.toISOString(),
          allowedFeatures: editFeatures,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao atualizar licença.");

      setEditingLicense(null);
      onRefresh();
    } catch (err: any) {
      setError(err.message || "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(licenseId: string, newStatus: string) {
    try {
      await fetch(`/api/proxy/licenses/${licenseId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onRefresh();
    } catch (err) {
      console.error("Erro ao alterar status da licença:", err);
    }
  }

  async function handleDelete() {
    if (!deletingLicense) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/proxy/licenses/${deletingLicense.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Falha ao excluir licença.");
      } else {
        setDeletingLicense(null);
        onRefresh();
      }
    } catch (err) {
      alert("Falha de conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    if (!targetLicenseId) return;
    try {
      await fetch(`/api/proxy/licenses/${targetLicenseId}/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: revokeReason || "Revogação manual pelo proprietário." }),
      });
      setRevokeModalOpen(false);
      setTargetLicenseId(null);
      setRevokeReason("");
      onRefresh();
    } catch (err) {
      console.error("Erro na revogação:", err);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2500);
  }

  function downloadLicenseFile(lic: any) {
    const payload = lic.payload || {
      activationKey: lic.activationKey,
      client: lic.client,
      plan: lic.plan,
      features: lic.allowedFeatures,
      expiresAt: lic.expiresAt,
      issuedAt: lic.issuedAt,
    };

    const licenseData = {
      license: payload,
      signature: lic.rsaSignature,
      algorithm: "RSA-SHA256",
      publicKey: lic.publicKey,
    };

    const blob = new Blob([JSON.stringify(licenseData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lic.activationKey}.lic`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b263b] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>🔑</span>
            <span>Gerenciador de Licenças & Chaves Criptografadas RSA</span>
          </h2>
          <p className="text-xs text-slate-400">
            Cadastrar, editar validade e recursos (com recálculo RSA), suspender, pausar e excluir chaves.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setGeneratedLicense(null);
            setIsGenerateModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#00df81] px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-[#1fe28c] shadow-lg shadow-emerald-500/20"
        >
          <Key className="h-4 w-4" />
          <span>Gerar Nova Licença RSA</span>
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por chave de ativação, cliente ou plano..."
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
            <option value="ACTIVE">Ativas</option>
            <option value="PAUSED">Pausadas</option>
            <option value="EXPIRED">Expiradas</option>
            <option value="REVOKED">Revogadas/Suspensas</option>
          </select>
        </div>
      </div>

      {/* Tabela de Licenças */}
      <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#091122] text-[11px] font-semibold text-slate-400 border-b border-[#162238]">
              <tr>
                <th className="px-4 py-3">Chave de Ativação</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Emissão & Expiração</th>
                <th className="px-4 py-3">Última Validação</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162238]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma licença encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-[#0e172a] transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                        <span>{l.activationKey}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(l.activationKey)}
                          title="Copiar chave"
                          className="text-slate-500 hover:text-white"
                        >
                          {copiedKey === l.activationKey ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs font-mono mt-0.5">
                        Assinatura RSA: {l.rsaSignature?.slice(0, 24)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{l.client?.name}</div>
                      <div className="text-[10px] text-slate-400">{l.client?.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                        {l.plan?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      <div>{new Date(l.issuedAt).toLocaleDateString("pt-BR")}</div>
                      <div className="text-slate-500 text-[10px]">Até {new Date(l.expiresAt).toLocaleDateString("pt-BR")}</div>
                    </td>
                    <td className="px-4 py-3 text-[11px]">
                      {l.lastValidatedAt ? (
                        <span className="text-emerald-400 font-mono">
                          {new Date(l.lastValidatedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Pendente ativação</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                          l.status === "ACTIVE"
                            ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                            : l.status === "PAUSED"
                              ? "border-amber-500/30 bg-amber-950/40 text-amber-300"
                              : l.status === "EXPIRED"
                                ? "border-amber-500/30 bg-amber-950/40 text-amber-400"
                                : "border-rose-500/30 bg-rose-950/40 text-rose-400"
                        }`}
                      >
                        <span>
                          {l.status === "ACTIVE"
                            ? "ATIVO"
                            : l.status === "PAUSED"
                              ? "PAUSADO"
                              : l.status === "REVOKED"
                                ? "REVOGADO"
                                : l.status}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Baixar .lic */}
                        <button
                          type="button"
                          onClick={() => downloadLicenseFile(l)}
                          title="Baixar arquivo de licença criptografada (.lic)"
                          className="rounded-lg border border-[#233352] bg-[#091122] p-1.5 text-slate-400 hover:text-white"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => openEditModal(l)}
                          title="Editar validade e recursos liberados"
                          className="rounded-lg border border-[#233352] bg-[#091122] p-1.5 text-slate-300 hover:border-[#00df81] hover:text-[#00df81] transition"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        {/* Pausar / Reativar */}
                        {l.status === "ACTIVE" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(l.id, "PAUSED")}
                            title="Pausar licença"
                            className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-1.5 text-amber-300 hover:bg-amber-900/40 transition"
                          >
                            <Pause className="h-3.5 w-3.5" />
                          </button>
                        ) : l.status === "PAUSED" ? (
                          <button
                            type="button"
                            onClick={() => handleStatusChange(l.id, "ACTIVE")}
                            title="Reativar licença"
                            className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-1.5 text-emerald-400 hover:bg-emerald-900/40 transition"
                          >
                            <Play className="h-3.5 w-3.5" />
                          </button>
                        ) : null}

                        {/* Revogar / Suspender */}
                        {l.status === "ACTIVE" && (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetLicenseId(l.id);
                              setRevokeModalOpen(true);
                            }}
                            title="Revogar licença"
                            className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-1.5 text-rose-400 hover:bg-rose-900/40 transition"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => setDeletingLicense(l)}
                          title="Excluir licença"
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

      {/* Modal de Geração de Licença RSA */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#00df81]" />
                <span>Gerador Criptográfico de Licença RSA</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
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

            {generatedLicense ? (
              <div className="space-y-4 py-2">
                <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-center">
                  <span className="text-xs font-semibold text-emerald-400">CHAVE GERADA COM SUCESSO</span>
                  <div className="mt-2 text-lg font-mono font-bold text-white tracking-wider">
                    {generatedLicense.activationKey}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-300">
                    Assinada digitalmente com RSA 4096-bit SHA-256.
                  </p>
                </div>

                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedLicense.activationKey)}
                    className="flex items-center gap-2 rounded-xl bg-[#00df81] px-4 py-2 text-xs font-bold text-slate-950 hover:bg-[#1fe28c]"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copiar Chave</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadLicenseFile(generatedLicense)}
                    className="flex items-center gap-2 rounded-xl border border-[#233352] bg-[#091122] px-4 py-2 text-xs font-semibold text-white hover:border-[#00df81]"
                  >
                    <Download className="h-4 w-4" />
                    <span>Baixar Arquivo .lic</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-3.5 text-xs">
                {/* Banner de Regra Obrigatória de Assinatura */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-[11px] text-emerald-300 flex items-center gap-2">
                  <Shield className="h-4 w-4 shrink-0 text-[#00df81]" />
                  <span>
                    <strong>Regra Obrigatória:</strong> A licença é vinculada ao cliente e a uma assinatura com ciclo de faturamento ativo.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Cliente Cadastrado *</label>
                  <select
                    required
                    value={clientId}
                    onChange={(e) => {
                      setClientId(e.target.value);
                      setSubscriptionOption("NEW");
                    }}
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
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Seleção de Assinatura Vinculada */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Assinatura Vinculada *</label>
                  <select
                    value={subscriptionOption}
                    onChange={(e) => setSubscriptionOption(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  >
                    <option value="NEW">+ Criar Nova Assinatura Automática para este Cliente</option>
                    {subscriptions
                      .filter((s) => s.clientId === clientId && s.status === "ATIVO")
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Assinatura Ativa: {s.plan?.name} ({s.billingCycle === "MONTHLY" ? "Mensal" : s.billingCycle === "QUARTERLY" ? "Trimestral" : "Anual"}) - Venc: {new Date(s.nextBillingDate).toLocaleDateString("pt-BR")}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Se for criar nova assinatura vinculada */}
                {subscriptionOption === "NEW" && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-[#1b263b] bg-[#091122]/60">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Ciclo de Pagamento *</label>
                      <select
                        value={billingCycle}
                        onChange={(e) => setBillingCycle(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#1b263b] bg-[#070b14] px-2.5 text-white outline-none focus:border-[#00df81]"
                      >
                        <option value="MONTHLY">Mensal (1 Mês)</option>
                        <option value="QUARTERLY">Trimestral (3 Meses)</option>
                        <option value="ANNUAL">Anual (12 Meses)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">Forma de Pagamento *</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="h-9 w-full rounded-lg border border-[#1b263b] bg-[#070b14] px-2.5 text-white outline-none focus:border-[#00df81]"
                      >
                        <option value="PIX">PIX</option>
                        <option value="CARTAO">Cartão de Crédito</option>
                        <option value="DEBITO">Cartão de Débito</option>
                        <option value="BOLETO">Boleto Bancário</option>
                        <option value="CORTESIA">Cortesia / Bonificado</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Validade Inicial da Licença</label>
                  <select
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                  >
                    <option value="30">30 dias (Alinhado com ciclo Mensal)</option>
                    <option value="90">90 dias (Alinhado com ciclo Trimestral)</option>
                    <option value="365">365 dias (Alinhado com ciclo Anual)</option>
                    <option value="7">7 dias (Trial)</option>
                    <option value="3650">3650 dias (10 Anos - Unlimited)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
                  <button
                    type="button"
                    onClick={() => setIsGenerateModalOpen(false)}
                    className="rounded-xl border border-[#233352] px-4 py-2 font-semibold text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-[#00df81] px-5 py-2 font-bold text-slate-950 hover:bg-[#1fe28c] disabled:opacity-50"
                  >
                    {loading ? "Assinando RSA..." : "Emitir Licença"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição de Licença */}
      {editingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="h-5 w-5 text-emerald-400" />
                <span>Editar Licença & Recalcular RSA</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingLicense(null)}
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
                <span className="text-slate-400 block text-[11px]">Chave</span>
                <strong className="text-white font-mono text-sm">{editingLicense.activationKey}</strong>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Expiração Atual</span>
                <span className="text-slate-200 font-mono">
                  {new Date(editingLicense.expiresAt).toLocaleDateString("pt-BR")}
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Adicionar Dias de Validade
                </label>
                <select
                  value={editDaysToAdd}
                  onChange={(e) => setEditDaysToAdd(e.target.value)}
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                >
                  <option value="0">Manter data atual</option>
                  <option value="15">+15 dias</option>
                  <option value="30">+30 dias (1 mês)</option>
                  <option value="90">+90 dias (3 meses)</option>
                  <option value="365">+365 dias (1 ano)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
                <button
                  type="button"
                  onClick={() => setEditingLicense(null)}
                  className="rounded-xl border border-[#233352] px-4 py-2 font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-[#00df81] px-5 py-2 font-bold text-slate-950 hover:bg-[#1fe28c] disabled:opacity-50"
                >
                  {loading ? "Recalculando Assinatura..." : "Salvar & Reassinar RSA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Revogação */}
      {revokeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Revogar Licença</h3>
            </div>
            <p className="text-xs text-slate-300">
              Esta ação bloqueará imediatamente a execução desta chave nas verificações online do CTRL-Farm.
            </p>
            <div className="space-y-1 text-xs">
              <label className="font-semibold text-slate-300">Motivo da Revogação</label>
              <textarea
                rows={2}
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Ex: Inadimplência ou cancelamento solicitado"
                className="w-full rounded-xl border border-[#1b263b] bg-[#091122] p-2.5 text-white outline-none focus:border-rose-500"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
              <button
                type="button"
                onClick={() => setRevokeModalOpen(false)}
                className="rounded-xl border border-[#233352] px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-500"
              >
                Confirmar Revogação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {deletingLicense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-[#0c1425] p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Excluir Licença</h3>
            </div>
            <p className="text-xs text-slate-300">
              Deseja remover permanentemente a licença{" "}
              <strong className="text-white font-mono">{deletingLicense.activationKey}</strong>?
            </p>
            <div className="flex justify-end gap-2.5 pt-3 border-t border-[#1b263b]">
              <button
                type="button"
                onClick={() => setDeletingLicense(null)}
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
