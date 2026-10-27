"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  CreditCard,
  Building2,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Save,
  Zap,
  UserCheck,
  Lock,
  Mail,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";

interface GatewayConfig {
  id: string;
  provider: string;
  displayName: string;
  enabled: boolean;
  isSandbox: boolean;
  webhookUrl: string;
  credentials: Record<string, any>;
  acceptedMethods: string[];
}

interface SystemSettingsData {
  companyName: string;
  tradeName: string;
  document: string;
  supportEmail: string;
  supportPhone: string;
  defaultOfflineGraceDays: number;
  autoGenerateLicenseOnPayment: boolean;
  autoRenewSubscription: boolean;
  notifyExpiringLicensesDays: number;
  termsOfServiceUrl: string;
  privacyPolicyUrl: string;
}

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<"gateways" | "general" | "admin" | "transactions" | "rsa">("gateways");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SystemSettingsData>({
    companyName: "",
    tradeName: "",
    document: "",
    supportEmail: "",
    supportPhone: "",
    defaultOfflineGraceDays: 7,
    autoGenerateLicenseOnPayment: true,
    autoRenewSubscription: true,
    notifyExpiringLicensesDays: 15,
    termsOfServiceUrl: "",
    privacyPolicyUrl: "",
  });

  // Admin User Profile State
  const [adminProfile, setAdminProfile] = useState<{
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    lastLoginAt?: string | null;
    createdAt?: string;
  }>({
    id: "",
    name: "",
    username: "",
    email: "",
    role: "OWNER",
  });

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  // Gateways State
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [selectedGateway, setSelectedGateway] = useState<string>("MERCADO_PAGO");
  const [testingGateway, setTestingGateway] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; message: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [settRes, gwRes, txRes, meRes] = await Promise.allSettled([
          fetch("/api/proxy/settings"),
          fetch("/api/proxy/settings/gateways"),
          fetch("/api/proxy/payments/transactions"),
          fetch("/api/proxy/auth/me"),
        ]);

        if (settRes.status === "fulfilled" && settRes.value.ok) {
          const s = await settRes.value.json();
          setSettings({
            companyName: s.companyName || "",
            tradeName: s.tradeName || "",
            document: s.document || "",
            supportEmail: s.supportEmail || "",
            supportPhone: s.supportPhone || "",
            defaultOfflineGraceDays: s.defaultOfflineGraceDays ?? 7,
            autoGenerateLicenseOnPayment: s.autoGenerateLicenseOnPayment ?? true,
            autoRenewSubscription: s.autoRenewSubscription ?? true,
            notifyExpiringLicensesDays: s.notifyExpiringLicensesDays ?? 15,
            termsOfServiceUrl: s.termsOfServiceUrl || "",
            privacyPolicyUrl: s.privacyPolicyUrl || "",
          });
        }

        if (gwRes.status === "fulfilled" && gwRes.value.ok) {
          const gws = await gwRes.value.json();
          setGateways(Array.isArray(gws) ? gws : []);
        }

        if (txRes.status === "fulfilled" && txRes.value.ok) {
          const txs = await txRes.value.json();
          setTransactions(Array.isArray(txs) ? txs : []);
        }

        if (meRes.status === "fulfilled" && meRes.value.ok) {
          const me = await meRes.value.json();
          setAdminProfile({
            id: me.id || "",
            name: me.name || "",
            username: me.username || "",
            email: me.email || "",
            role: me.role || "OWNER",
            lastLoginAt: me.lastLoginAt,
            createdAt: me.createdAt,
          });
        }
      } catch (err) {
        console.error("Erro ao carregar configurações:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  async function handleSaveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotification(null);

    try {
      const res = await fetch("/api/proxy/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Falha ao salvar configurações gerais.");
      setNotification({ type: "success", text: "Configurações gerais atualizadas com sucesso!" });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Erro ao salvar." });
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAdminProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setNotification(null);
    try {
      const res = await fetch("/api/proxy/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: adminProfile.name,
          username: adminProfile.username,
          email: adminProfile.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao atualizar perfil do administrador.");
      setNotification({ type: "success", text: "Perfil do Administrador Geral atualizado com sucesso!" });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Erro ao salvar perfil." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      setNotification({ type: "error", text: "Informe a senha atual." });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setNotification({ type: "error", text: "A nova senha deve ter no mínimo 6 caracteres." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setNotification({ type: "error", text: "A confirmação da senha não coincide com a nova senha." });
      return;
    }

    setSavingPassword(true);
    setNotification(null);
    try {
      const res = await fetch("/api/proxy/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha ao alterar senha.");
      setNotification({
        type: "success",
        text: "Senha alterada com sucesso! Utilize suas novas credenciais no próximo login.",
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Erro ao alterar senha." });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleTestForgotPassword() {
    if (!adminProfile.email) {
      setNotification({ type: "error", text: "Cadastre um e-mail de recuperação primeiro." });
      return;
    }
    setNotification(null);
    try {
      const res = await fetch("/api/proxy/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminProfile.email }),
      });
      const data = await res.json();
      setNotification({
        type: "success",
        text: data.message || `Instruções de recuperação enviadas para ${adminProfile.email}`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (err: any) {
      setNotification({ type: "error", text: "Erro ao solicitar recuperação." });
    }
  }

  async function handleCheckAllFirebaseAndSubscriptions() {
    setCheckingAll(true);
    setNotification(null);
    try {
      const res = await fetch("/api/proxy/subscriptions/check-all", {
        method: "POST",
      });
      const data = await res.json();
      setCheckResult(data);
      setNotification({
        type: "success",
        text: `Checagem concluída! ${data.dueResults?.total || 0} assinaturas analisadas, ${data.activeLicensesSynced || 0} chaves sincronizadas com o Firebase.`,
      });
      setTimeout(() => setNotification(null), 6000);
    } catch (err: any) {
      setNotification({ type: "error", text: "Falha na checagem geral de assinaturas e Firebase." });
    } finally {
      setCheckingAll(false);
    }
  }

  async function handleSaveGateway(gw: GatewayConfig) {
    setSaving(true);
    setNotification(null);
    try {
      const res = await fetch(`/api/proxy/settings/gateways/${gw.provider}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: gw.enabled,
          isSandbox: gw.isSandbox,
          credentials: gw.credentials,
          acceptedMethods: gw.acceptedMethods,
        }),
      });

      if (!res.ok) throw new Error("Falha ao salvar gateway.");
      setNotification({ type: "success", text: `Gateway ${gw.displayName} atualizado com sucesso!` });
      setTimeout(() => setNotification(null), 4000);
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Erro ao atualizar gateway." });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestGateway(provider: string) {
    setTestingGateway(provider);
    setTestResult(null);
    try {
      const res = await fetch(`/api/proxy/settings/gateways/${provider}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResult({
        provider,
        success: data.success,
        message: data.message,
      });
    } catch (err) {
      setTestResult({
        provider,
        success: false,
        message: "Falha na comunicação de rede com o servidor.",
      });
    } finally {
      setTestingGateway(null);
    }
  }

  function updateCurrentGwState(updater: (gw: GatewayConfig) => GatewayConfig) {
    setGateways((prev) =>
      prev.map((g) => (g.provider === selectedGateway ? updater(g) : g))
    );
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2500);
  }

  const activeGw = gateways.find((g) => g.provider === selectedGateway);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm">Carregando painel de configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b263b] pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>⚙️</span>
            <span>Configurações do Sistema ADM Gerente</span>
          </h2>
          <p className="text-xs text-slate-400">
            Parâmetros globais, gateways de pagamento (PIX, Cartão, Boleto), webhooks e chaves de segurança.
          </p>
        </div>

        {notification && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold ${
              notification.type === "success"
                ? "border border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                : "border border-rose-500/40 bg-rose-950/40 text-rose-300"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <span>{notification.text}</span>
          </div>
        )}
      </div>

      {/* Navegação entre seções de configuração */}
      <div className="flex flex-wrap gap-2 border-b border-[#1b263b] pb-2 text-xs">
        <button
          type="button"
          onClick={() => setActiveSection("gateways")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition ${
            activeSection === "gateways"
              ? "bg-[#00df81] text-slate-950 shadow-md shadow-emerald-500/20"
              : "bg-[#0c1425] text-slate-300 hover:text-white border border-[#1b263b]"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Assinaturas & Gateways de Pagamento</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("general")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition ${
            activeSection === "general"
              ? "bg-[#00df81] text-slate-950 shadow-md shadow-emerald-500/20"
              : "bg-[#0c1425] text-slate-300 hover:text-white border border-[#1b263b]"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Dados da Empresa & Regras Globais</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("admin")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition ${
            activeSection === "admin"
              ? "bg-[#00df81] text-slate-950 shadow-md shadow-emerald-500/20"
              : "bg-[#0c1425] text-slate-300 hover:text-white border border-[#1b263b]"
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>Administrador Geral & Segurança</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("transactions")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition ${
            activeSection === "transactions"
              ? "bg-[#00df81] text-slate-950 shadow-md shadow-emerald-500/20"
              : "bg-[#0c1425] text-slate-300 hover:text-white border border-[#1b263b]"
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Transações & Webhooks Recebidos</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection("rsa")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 font-bold transition ${
            activeSection === "rsa"
              ? "bg-[#00df81] text-slate-950 shadow-md shadow-emerald-500/20"
              : "bg-[#0c1425] text-slate-300 hover:text-white border border-[#1b263b]"
          }`}
        >
          <Key className="h-4 w-4" />
          <span>Chaves Criptográficas RSA</span>
        </button>
      </div>

      {/* SEÇÃO 1: GATEWAYS DE PAGAMENTO */}
      {activeSection === "gateways" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Menu Lateral de Provedores */}
          <div className="lg:col-span-1 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block px-1">
              Provedores Integrados
            </span>
            {gateways.map((gw) => (
              <button
                key={gw.provider}
                type="button"
                onClick={() => {
                  setSelectedGateway(gw.provider);
                  setTestResult(null);
                }}
                className={`w-full text-left rounded-xl p-3.5 transition border ${
                  selectedGateway === gw.provider
                    ? "border-[#00df81] bg-[#0c1425] shadow-lg shadow-emerald-500/10"
                    : "border-[#1b263b] bg-[#091122] hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{gw.displayName}</span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      gw.enabled ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px]">
                  <span
                    className={`rounded px-1.5 py-0.5 font-semibold ${
                      gw.enabled
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {gw.enabled ? "Ativo" : "Inativo"}
                  </span>
                  <span className="text-slate-400">
                    {gw.isSandbox ? "Sandbox" : "Produção"}
                  </span>
                </div>
              </button>
            ))}

            <div className="rounded-xl border border-[#1b263b] bg-[#0c1425] p-3 text-[11px] text-slate-400 space-y-1 mt-4">
              <strong className="text-slate-200 block">💡 Formas de Pagamento</strong>
              <p>
                Configure os tokens de API para receber pagamentos via PIX instantâneo, Cartão de Crédito/Débito e Boleto com baixa automática e geração instantânea de licença RSA.
              </p>
            </div>
          </div>

          {/* Área de Configuração do Provedor Selecionado */}
          {activeGw && (
            <div className="lg:col-span-3 rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-xl space-y-6">
              {/* Topo do Gateway */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b263b] pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-bold text-white">{activeGw.displayName}</h3>
                    <span className="rounded-full border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                      {activeGw.provider}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Integração oficial via API REST e Webhooks para confirmação de pagamento.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* Toggle Ativo/Inativo */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={activeGw.enabled}
                      onChange={(e) =>
                        updateCurrentGwState((g) => ({ ...g, enabled: e.target.checked }))
                      }
                      className="h-4 w-4 rounded accent-[#00df81]"
                    />
                    <span>Habilitar Gateway</span>
                  </label>

                  {/* Toggle Sandbox */}
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={activeGw.isSandbox}
                      onChange={(e) =>
                        updateCurrentGwState((g) => ({ ...g, isSandbox: e.target.checked }))
                      }
                      className="h-4 w-4 rounded accent-amber-400"
                    />
                    <span>Modo Sandbox (Testes)</span>
                  </label>
                </div>
              </div>

              {/* URL do Webhook */}
              <div className="rounded-xl border border-[#1b263b] bg-[#091122] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">
                    URL de Webhook Oficial (Configure no painel do {activeGw.displayName}):
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeGw.webhookUrl)}
                    className="flex items-center gap-1.5 text-xs text-[#00df81] hover:underline font-semibold"
                  >
                    {copiedUrl === activeGw.webhookUrl ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copiar URL</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="font-mono text-xs text-slate-300 bg-[#070b14] p-2.5 rounded-lg border border-[#1b263b] break-all select-all">
                  {activeGw.webhookUrl}
                </div>
                <p className="text-[11px] text-slate-400">
                  O ADM Gerente valida a notificação de pagamento recebida nesta URL e libera a licença RSA correspondente automaticamente.
                </p>
              </div>

              {/* Form de Credenciais Específicas por Gateway */}
              <div className="space-y-4 text-xs">
                <h4 className="font-bold text-white text-sm border-b border-[#1b263b] pb-2">
                  Credenciais de Autenticação na API
                </h4>

                {activeGw.provider === "MERCADO_PAGO" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">
                        Access Token Oficial (Bearer Token) *
                      </label>
                      <input
                        type="password"
                        value={activeGw.credentials?.accessToken || ""}
                        onChange={(e) =>
                          updateCurrentGwState((g) => ({
                            ...g,
                            credentials: { ...g.credentials, accessToken: e.target.value },
                          }))
                        }
                        placeholder="APP_USR-xxxx-xxxx..."
                        className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-300">Public Key</label>
                        <input
                          type="text"
                          value={activeGw.credentials?.publicKey || ""}
                          onChange={(e) =>
                            updateCurrentGwState((g) => ({
                              ...g,
                              credentials: { ...g.credentials, publicKey: e.target.value },
                            }))
                          }
                          placeholder="APP_USR-xxxx..."
                          className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-300">Webhook Secret Key</label>
                        <input
                          type="password"
                          value={activeGw.credentials?.webhookSecret || ""}
                          onChange={(e) =>
                            updateCurrentGwState((g) => ({
                              ...g,
                              credentials: { ...g.credentials, webhookSecret: e.target.value },
                            }))
                          }
                          placeholder="Chave secreta para validação HMAC"
                          className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeGw.provider === "PAGSEGURO" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">
                        Token de Acesso PagBank / PagSeguro *
                      </label>
                      <input
                        type="password"
                        value={activeGw.credentials?.token || ""}
                        onChange={(e) =>
                          updateCurrentGwState((g) => ({
                            ...g,
                            credentials: { ...g.credentials, token: e.target.value },
                          }))
                        }
                        placeholder="Token de integração gerado no painel PagBank"
                        className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-300">Chave Pública (Public Key)</label>
                        <input
                          type="text"
                          value={activeGw.credentials?.publicKey || ""}
                          onChange={(e) =>
                            updateCurrentGwState((g) => ({
                              ...g,
                              credentials: { ...g.credentials, publicKey: e.target.value },
                            }))
                          }
                          placeholder="PUBKEY_xxxx..."
                          className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-300">E-mail da Conta PagSeguro</label>
                        <input
                          type="email"
                          value={activeGw.credentials?.accountEmail || ""}
                          onChange={(e) =>
                            updateCurrentGwState((g) => ({
                              ...g,
                              credentials: { ...g.credentials, accountEmail: e.target.value },
                            }))
                          }
                          placeholder="financeiro@empresa.com.br"
                          className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeGw.provider === "INFINITEPAY" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">
                        API Key / Secret Key Cloud InfinitePay *
                      </label>
                      <input
                        type="password"
                        value={activeGw.credentials?.apiKey || ""}
                        onChange={(e) =>
                          updateCurrentGwState((g) => ({
                            ...g,
                            credentials: { ...g.credentials, apiKey: e.target.value },
                          }))
                        }
                        placeholder="Chave de API InfinitePay"
                        className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-300">Wallet ID / Handle InfinitePay</label>
                        <input
                          type="text"
                          value={activeGw.credentials?.walletId || ""}
                          onChange={(e) =>
                            updateCurrentGwState((g) => ({
                              ...g,
                              credentials: { ...g.credentials, walletId: e.target.value },
                            }))
                          }
                          placeholder="@suaempresa ou wallet_id"
                          className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-300">Client ID (opcional)</label>
                        <input
                          type="text"
                          value={activeGw.credentials?.clientId || ""}
                          onChange={(e) =>
                            updateCurrentGwState((g) => ({
                              ...g,
                              credentials: { ...g.credentials, clientId: e.target.value },
                            }))
                          }
                          placeholder="client_id"
                          className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeGw.provider === "ASAAS" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">
                        Chave de API Oficial Asaas (Access Token) *
                      </label>
                      <input
                        type="password"
                        value={activeGw.credentials?.apiKey || ""}
                        onChange={(e) =>
                          updateCurrentGwState((g) => ({
                            ...g,
                            credentials: { ...g.credentials, apiKey: e.target.value },
                          }))
                        }
                        placeholder="$asaas_xxxx..."
                        className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-300">
                        Token do Webhook Asaas (para validação do cabeçalho asaas-access-token)
                      </label>
                      <input
                        type="password"
                        value={activeGw.credentials?.webhookToken || ""}
                        onChange={(e) =>
                          updateCurrentGwState((g) => ({
                            ...g,
                            credentials: { ...g.credentials, webhookToken: e.target.value },
                          }))
                        }
                        placeholder="Token cadastrado nas configurações de webhook do Asaas"
                        className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                      />
                    </div>
                  </div>
                )}

                {/* Métodos de Pagamento Aceitos */}
                <div className="space-y-2 pt-2 border-t border-[#1b263b]">
                  <label className="font-semibold text-slate-300 block">
                    Métodos de Pagamento Aceitos por este Provedor:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: "PIX", label: "PIX Instantâneo" },
                      { id: "BOLETO", label: "Boleto Bancário" },
                      { id: "CREDIT_CARD", label: "Cartão de Crédito" },
                      { id: "DEBIT_CARD", label: "Cartão de Débito" },
                    ].map((m) => {
                      const isChecked = activeGw.acceptedMethods?.includes(m.id);
                      return (
                        <label
                          key={m.id}
                          className="flex items-center gap-2 rounded-xl border border-[#1b263b] bg-[#091122] p-2.5 cursor-pointer hover:border-[#00df81]"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const methods = new Set(activeGw.acceptedMethods || []);
                              if (e.target.checked) methods.add(m.id);
                              else methods.delete(m.id);
                              updateCurrentGwState((g) => ({
                                ...g,
                                acceptedMethods: Array.from(methods),
                              }));
                            }}
                            className="h-4 w-4 rounded accent-[#00df81]"
                          />
                          <span className="font-semibold text-slate-200">{m.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Resultado do Teste de Conexão */}
                {testResult && testResult.provider === activeGw.provider && (
                  <div
                    className={`rounded-xl border p-3 flex items-center gap-2.5 ${
                      testResult.success
                        ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-300"
                        : "border-rose-500/40 bg-rose-950/40 text-rose-300"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0" />
                    )}
                    <div className="text-xs">
                      <strong className="block">
                        {testResult.success ? "Conexão Validada com Sucesso!" : "Falha na Validação"}
                      </strong>
                      <span>{testResult.message}</span>
                    </div>
                  </div>
                )}

                {/* Botões de Ação */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1b263b]">
                  <button
                    type="button"
                    disabled={testingGateway === activeGw.provider}
                    onClick={() => handleTestGateway(activeGw.provider)}
                    className="flex items-center gap-2 rounded-xl border border-[#233352] bg-[#091122] px-4 py-2 text-xs font-bold text-slate-200 hover:border-[#00df81] hover:text-[#00df81] transition disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${
                        testingGateway === activeGw.provider ? "animate-spin text-[#00df81]" : ""
                      }`}
                    />
                    <span>
                      {testingGateway === activeGw.provider
                        ? "Validando com API..."
                        : "Testar Conexão / Validar Credenciais"}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveGateway(activeGw)}
                    className="flex items-center gap-2 rounded-xl bg-[#00df81] px-5 py-2 text-xs font-bold text-slate-950 hover:bg-[#1fe28c] transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{saving ? "Salvando..." : "Salvar Configuração do Gateway"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 2: DADOS DA EMPRESA & REGRAS GLOBAIS */}
      {activeSection === "general" && (
        <form onSubmit={handleSaveGeneral} className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-xl space-y-5 text-xs">
          <div className="border-b border-[#1b263b] pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#00df81]" />
              <span>Dados Cadastrais da Empresa Emissora CTRL-Farm</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Estes dados são embutidos nas notas fiscais, cobranças e licenças emitidas para os clientes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Razão Social</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Nome Fantasia</label>
              <input
                type="text"
                value={settings.tradeName}
                onChange={(e) => setSettings({ ...settings, tradeName: e.target.value })}
                className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">CNPJ da Empresa</label>
              <input
                type="text"
                value={settings.document}
                onChange={(e) => setSettings({ ...settings, document: e.target.value })}
                className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">E-mail Oficial de Suporte</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">Telefone / WhatsApp Comercial</label>
              <input
                type="text"
                value={settings.supportPhone}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">URL dos Termos de Uso (opcional)</label>
              <input
                type="url"
                value={settings.termsOfServiceUrl}
                onChange={(e) => setSettings({ ...settings, termsOfServiceUrl: e.target.value })}
                placeholder="https://ctrlfarm.com.br/termos"
                className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-300">URL da Política de Privacidade (opcional)</label>
              <input
                type="url"
                value={settings.privacyPolicyUrl}
                onChange={(e) => setSettings({ ...settings, privacyPolicyUrl: e.target.value })}
                placeholder="https://ctrlfarm.com.br/privacidade"
                className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
              />
            </div>
          </div>

          <div className="border-t border-[#1b263b] pt-4 space-y-4">
            <h4 className="font-bold text-white text-sm">Regras Globais de Licenciamento & Automação</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Dias de Tolerância Offline Padrão (Sem conexão de internet)
                </label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  value={settings.defaultOfflineGraceDays}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultOfflineGraceDays: Number(e.target.value) })
                  }
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">
                  Aviso de Vencimento de Licença (Dias de Antecedência)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.notifyExpiringLicensesDays}
                  onChange={(e) =>
                    setSettings({ ...settings, notifyExpiringLicensesDays: Number(e.target.value) })
                  }
                  className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.autoGenerateLicenseOnPayment}
                  onChange={(e) =>
                    setSettings({ ...settings, autoGenerateLicenseOnPayment: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-[#00df81]"
                />
                <span>Gerar e Ativar Licença RSA Automaticamente assim que o pagamento for aprovado</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={settings.autoRenewSubscription}
                  onChange={(e) =>
                    setSettings({ ...settings, autoRenewSubscription: e.target.checked })
                  }
                  className="h-4 w-4 rounded accent-[#00df81]"
                />
                <span>Renovação Automática de Cobrança ao Vencer o Ciclo</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#1b263b]">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-[#00df81] px-5 py-2 text-xs font-bold text-slate-950 hover:bg-[#1fe28c] transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Salvando..." : "Salvar Configurações Gerais"}</span>
            </button>
          </div>
        </form>
      )}

      {/* SEÇÃO: ADMINISTRADOR GERAL & SEGURANÇA */}
      {activeSection === "admin" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* CARD 1: PERFIL DO ADMINISTRADOR GERAL */}
            <div className="lg:col-span-2 rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-xl space-y-5 text-xs">
              <div className="border-b border-[#1b263b] pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-[#00df81]" />
                    <span>Perfil do Administrador Geral (Master)</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Gerencie suas informações de acesso, nome de exibição e e-mail para recuperação de senha.
                  </p>
                </div>
                <span className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-[11px] font-bold text-emerald-400 uppercase">
                  {adminProfile.role || "OWNER"}
                </span>
              </div>

              <form onSubmit={handleSaveAdminProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Nome Completo</label>
                    <input
                      type="text"
                      value={adminProfile.name}
                      onChange={(e) => setAdminProfile({ ...adminProfile, name: e.target.value })}
                      placeholder="Administrador Geral"
                      className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Nome de Usuário (Login)</label>
                    <input
                      type="text"
                      value={adminProfile.username}
                      onChange={(e) => setAdminProfile({ ...adminProfile, username: e.target.value })}
                      placeholder="Administrador"
                      className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 font-mono text-white outline-none focus:border-[#00df81]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 flex items-center justify-between">
                    <span>E-mail para Acesso & Recuperação de Senha *</span>
                    <span className="text-[11px] text-slate-400">Usado para redefinição segura de credenciais</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={adminProfile.email}
                      onChange={(e) => setAdminProfile({ ...adminProfile, email: e.target.value })}
                      placeholder="admin@ctrlfarm.com.br"
                      className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 pl-9 text-white outline-none focus:border-[#00df81]"
                      required
                    />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1b263b]">
                  <div className="text-[11px] text-slate-400">
                    {adminProfile.lastLoginAt ? (
                      <span>Último login registrado: {new Date(adminProfile.lastLoginAt).toLocaleString("pt-BR")}</span>
                    ) : (
                      <span>Usuário com permissão irrestrita ao ecossistema CTRL-Farm</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-2 rounded-xl bg-[#00df81] px-5 py-2 text-xs font-bold text-slate-950 hover:bg-[#1fe28c] transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    <span>{savingProfile ? "Salvando..." : "Salvar Perfil do Administrador"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* CARD 2: RECUPERAÇÃO DE CONTA */}
            <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-xl space-y-4 text-xs">
              <div className="border-b border-[#1b263b] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-sky-400" />
                  <span>Recuperação de Senha</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Recuperação em caso de esquecimento da senha mestra.
                </p>
              </div>

              <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3.5 space-y-2 text-slate-300">
                <p className="font-semibold text-sky-300 flex items-center gap-1.5">
                  <Mail className="h-4 w-4" />
                  <span>E-mail Atual de Recuperação:</span>
                </p>
                <p className="font-mono text-white text-xs break-all bg-[#070b14] p-2 rounded-lg border border-[#1b263b]">
                  {adminProfile.email || "Nenhum e-mail configurado"}
                </p>
                <p className="text-[11px] text-slate-400">
                  Ao solicitar redefinição, instruções criptografadas são emitidas diretamente para este destinatário.
                </p>
              </div>

              <button
                type="button"
                onClick={handleTestForgotPassword}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 py-2.5 font-bold text-sky-300 hover:bg-sky-900/40 transition"
              >
                <Mail className="h-4 w-4" />
                <span>Testar Envio de Recuperação</span>
              </button>
            </div>
          </div>

          {/* GRID 2: ALTERAÇÃO DE SENHA & SINCRONIZAÇÃO GERAL FIREBASE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ALTERAÇÃO DE SENHA */}
            <form onSubmit={handleChangePassword} className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-xl space-y-4 text-xs">
              <div className="border-b border-[#1b263b] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-amber-400" />
                  <span>Alteração de Senha Master</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  A senha é protegida com criptografia BCrypt de alta segurança (10 salt rounds).
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Senha Atual *</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 pr-10 text-white outline-none focus:border-[#00df81]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Nova Senha (Mínimo 6) *</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="••••••••"
                        className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 pr-10 text-white outline-none focus:border-[#00df81]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Confirmar Nova Senha *</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-[#1b263b] bg-[#091122] px-3 text-white outline-none focus:border-[#00df81]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-[#1b263b]">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2 font-bold transition shadow-md shadow-amber-500/20 disabled:opacity-50"
                >
                  <Lock className="h-4 w-4" />
                  <span>{savingPassword ? "Alterando..." : "Alterar Senha do Administrador"}</span>
                </button>
              </div>
            </form>

            {/* ROTINA DE CHECAGEM GERAL ASSINATURAS & FIREBASE */}
            <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-xl space-y-4 text-xs">
              <div className="border-b border-[#1b263b] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-[#00df81]" />
                  <span>Sincronização & Validação Firebase</span>
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Desacoplamento em nuvem: Chaves criadas, pausadas, alteradas ou canceladas são registradas no Firebase. O CTRL-Farm consulta e opera continuamente mesmo com o ADM fechado.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-4 space-y-2 text-slate-300">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Alta Disponibilidade & Continuidade Garantida</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Ao abrir o Sistema ADM, a checagem automática verifica os pagamentos das assinaturas e as datas de validade das chaves, aplicando as alterações necessárias tanto no banco local quanto no Firebase Firestore.
                </p>
              </div>

              {checkResult && (
                <div className="rounded-xl border border-[#1b263b] bg-[#091122] p-3.5 space-y-2 font-mono text-[11px]">
                  <p className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span>✅</span>
                    <span>Relatório da Última Checagem:</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div>Total de Assinaturas: <strong className="text-white">{checkResult.dueResults?.total ?? 0}</strong></div>
                    <div>Renovadas/Pagas: <strong className="text-emerald-400">{checkResult.dueResults?.renewed ?? 0}</strong></div>
                    <div>Suspensas: <strong className="text-rose-400">{checkResult.dueResults?.suspended ?? 0}</strong></div>
                    <div>Chaves no Firebase: <strong className="text-[#00df81]">{checkResult.activeLicensesSynced ?? 0}</strong></div>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={checkingAll}
                onClick={handleCheckAllFirebaseAndSubscriptions}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#00df81] px-5 py-2.5 font-bold text-slate-950 hover:bg-[#1fe28c] transition shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${checkingAll ? "animate-spin" : ""}`} />
                <span>{checkingAll ? "Executando Checagem..." : "Verificar Pagamentos e Sincronizar Chaves Firebase Agora"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO 3: TRANSAÇÕES & WEBHOOKS RECEBIDOS */}
      {activeSection === "transactions" && (
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] overflow-hidden shadow-xl space-y-4 p-6">
          <div className="border-b border-[#1b263b] pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <span>Histórico de Notificações de Pagamentos (Webhooks)</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Log em tempo real de pagamentos processados via Mercado Pago, PagSeguro, InfinitePay e Asaas.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#091122] text-[11px] font-semibold text-slate-400 border-b border-[#162238]">
                <tr>
                  <th className="px-4 py-3">ID Transação Gateway</th>
                  <th className="px-4 py-3">Provedor</th>
                  <th className="px-4 py-3">Método</th>
                  <th className="px-4 py-3">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Data / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162238]">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma transação de webhook recebida ainda.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#0e172a] transition">
                      <td className="px-4 py-3 font-mono font-bold text-white text-xs">
                        {tx.gatewayPaymentId}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                          {tx.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-200">
                        {tx.paymentMethod}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-400">
                        R$ {Number(tx.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                            tx.status === "PAID"
                              ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-400"
                              : "border-amber-500/30 bg-amber-950/40 text-amber-400"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {new Date(tx.createdAt).toLocaleString("pt-BR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SEÇÃO 4: CHAVES CRIPTOGRÁFICAS RSA */}
      {activeSection === "rsa" && (
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-6 shadow-xl space-y-4">
          <div className="border-b border-[#1b263b] pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#00df81]" />
              <span>Infraestrutura Criptográfica RSA 4096-bit</span>
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Par de chaves assimétricas usado para assinar digitalmente as licenças dos clientes CTRL-Farm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="h-4 w-4" />
                <span>Chave Privada do Servidor ADM</span>
              </div>
              <p className="text-slate-300">
                Armazenada com segurança em <code>keys/adm_private.pem</code> com permissões restritas. Nunca compartilhada com clientes.
              </p>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4 space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <ShieldCheck className="h-4 w-4" />
                <span>Chave Pública Distribuída</span>
              </div>
              <p className="text-slate-300">
                Embutida no cliente CTRL-Farm para verificação offline e online instantânea com algoritmo RSA-SHA256 determinístico.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
