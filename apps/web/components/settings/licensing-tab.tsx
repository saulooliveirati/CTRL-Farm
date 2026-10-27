"use client";

import { useEffect, useState } from "react";
import { useLicensing } from "@/contexts/licensing-context";
import {
  Key,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Download,
  Sparkles,
  ArrowUpRight,
  Clock,
  Layers,
  Lock,
  Unlock,
  Radio,
  FileCode,
  Zap,
} from "lucide-react";
import type { LicensingStatusData, UpdateCheckData } from "@/lib/server-licensing";

export function LicensingTab({
  currentUser,
}: {
  currentUser?: any;
}) {
  const { refreshLicensing } = useLicensing();
  const [statusData, setStatusData] = useState<LicensingStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  // Modal de ativação
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [activationKeyInput, setActivationKeyInput] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  // Controle de atualizações
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckData | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [savingPref, setSavingPref] = useState(false);

  async function loadStatus() {
    try {
      setRefreshing(true);
      const res = await fetch("/api/licensing/status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const payload: LicensingStatusData = data.data ?? data;
        setStatusData(payload);
        if (payload.license) {
          setAutoUpdateEnabled(payload.license.autoUpdate !== false);
        }
      }
    } catch (err) {
      console.error("Erro ao consultar status da licença:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function handleSyncLicense() {
    try {
      setRefreshing(true);
      setSyncFeedback(null);

      const res = await fetch("/api/licensing/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      const data = await res.json();
      const payload: LicensingStatusData = data.data ?? data;

      if (res.ok && payload) {
        setStatusData(payload);
        if (payload.license) {
          setAutoUpdateEnabled(payload.license.autoUpdate !== false);
        }
        await refreshLicensing();

        setSyncFeedback({
          type: payload.isLicensed ? "success" : "warning",
          message: payload.isLicensed
            ? `Licença sincronizada com sucesso com o Sistema ADM Gerente! Status: Ativa (${payload.license?.plan?.name || "Plano Ativo"}).`
            : payload.message || "Licença sincronizada, porém o status encontra-se restrito.",
        });
      } else {
        setSyncFeedback({
          type: "error",
          message: payload?.message || "Falha ao sincronizar com o Sistema ADM Gerente.",
        });
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar licença:", err);
      setSyncFeedback({
        type: "error",
        message: "Erro de comunicação ao sincronizar com o Sistema ADM Gerente.",
      });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCheckUpdates() {
    try {
      setCheckingUpdate(true);
      const res = await fetch("/api/licensing/updates?version=v2.5.0");
      if (res.ok) {
        const data = await res.json();
        setUpdateInfo(data.data ?? data);
      }
    } catch (err) {
      console.error("Erro ao verificar atualizações:", err);
    } finally {
      setCheckingUpdate(false);
    }
  }

  async function handleToggleAutoUpdate(enabled: boolean) {
    try {
      setSavingPref(true);
      setAutoUpdateEnabled(enabled);
      await fetch("/api/licensing/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoUpdate: enabled, updateChannel: "STABLE" }),
      });
    } catch (err) {
      console.error("Erro ao salvar preferência:", err);
    } finally {
      setSavingPref(false);
    }
  }

  async function handleActivateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActivating(true);
    setActivationError(null);
    setActivationSuccess(null);

    try {
      const cleanKey = activationKeyInput.trim().toUpperCase();
      const res = await fetch("/api/licensing/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationKey: cleanKey }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Chave de ativação inválida ou não autorizada.");
      }

      setActivationSuccess(data.message || "Licença ativada com sucesso!");
      setActivationKeyInput("");
      await loadStatus();
      setTimeout(() => {
        setShowActivateModal(false);
        setActivationSuccess(null);
      }, 2000);
    } catch (err: any) {
      setActivationError(err.message);
    } finally {
      setActivating(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  const isLicensed = statusData?.isLicensed === true;
  const plan = statusData?.license?.plan;
  const features = statusData?.license?.features || {};
  const planCode = plan?.code || "NONE";
  const daysRemaining = statusData?.daysRemaining ?? 0;

  // Cores por plano
  const planColorMap: Record<string, { bg: string; text: string; border: string }> = {
    STARTER: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
    PROFESSIONAL: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
    BUSINESS: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
    ENTERPRISE: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
    TRIAL: { bg: "bg-fuchsia-500/15", text: "text-fuchsia-400", border: "border-fuchsia-500/30" },
    UNLIMITED_OWNER: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/40" },
    NONE: { bg: "bg-zinc-800", text: "text-zinc-400", border: "border-zinc-700" },
  };

  const planTheme = planColorMap[planCode] || planColorMap.NONE;

  return (
    <div className="space-y-8">
      {/* Top Banner Informativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/60 p-5 rounded-2xl border border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              Assinatura & Licenciamento Oficial
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                RSA 4096-bit
              </span>
            </h2>
            <p className="text-xs text-zinc-400">
              Gerenciado pelo Sistema ADM Gerente com validação criptográfica ponta a ponta
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncLicense}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Sincronizando com ADM..." : "Sincronizar Licença"}
          </button>
          <button
            onClick={() => setShowActivateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 transition"
          >
            <Key className="w-3.5 h-3.5" />
            {isLicensed ? "Renovar / Trocar Chave" : "Inserir Chave de Ativação"}
          </button>
        </div>
      </div>

      {/* Feedback de Sincronização */}
      {syncFeedback && (
        <div
          className={`flex items-center justify-between gap-3 p-4 rounded-xl border text-xs font-semibold animate-in fade-in ${
            syncFeedback.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : syncFeedback.type === "warning"
                ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {syncFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Card da Assinatura Atual */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
            <div>
              <span className="text-xs font-medium text-zinc-400 block mb-1">
                Nível de Assinatura Atual
              </span>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xl font-extrabold px-3 py-1 rounded-xl border ${planTheme.bg} ${planTheme.text} ${planTheme.border}`}
                >
                  {plan?.name || (isLicensed ? "Licenciado" : "Não Ativado")}
                </span>
                {planCode === "UNLIMITED_OWNER" && (
                  <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Acesso Vitalício Irrevogável
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isLicensed ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Assinatura Ativa
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {statusData?.status === "EXPIRED" ? "Assinatura Expirada" : "Não Ativado"}
                </span>
              )}
            </div>
          </div>

          {/* Dados da Chave e Vigência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/60">
              <span className="text-xs text-zinc-500 block mb-1">Chave de Ativação do Usuário</span>
              {statusData?.license?.activationKey ? (
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-emerald-400 font-bold">
                    {statusData.license.activationKey}
                  </span>
                  <button
                    onClick={() => copyKey(statusData.license!.activationKey)}
                    className="text-zinc-500 hover:text-zinc-300 transition"
                    title="Copiar chave"
                  >
                    {copiedKey ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-zinc-500 italic">Nenhuma chave vinculada</span>
              )}
            </div>

            <div className="bg-zinc-950/70 p-4 rounded-xl border border-zinc-800/60">
              <span className="text-xs text-zinc-500 block mb-1">Validade & Vigência</span>
              {statusData?.license?.expiresAt ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-200">
                    Até{" "}
                    {new Date(statusData.license.expiresAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      daysRemaining > 30
                        ? "bg-emerald-500/15 text-emerald-400"
                        : daysRemaining > 7
                        ? "bg-amber-500/15 text-amber-400"
                        : "bg-red-500/15 text-red-400"
                    }`}
                  >
                    {daysRemaining} dias restantes
                  </span>
                </div>
              ) : (
                <span className="text-xs text-zinc-500 italic">—</span>
              )}
            </div>
          </div>

          {/* Modo de Validação & Sincronização */}
          <div className="text-xs text-zinc-400 bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-800/40 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Associado a:{" "}
                <strong className="text-white">{currentUser?.name || "Usuário Conectado"}</strong>{" "}
                ({currentUser?.email || "contato@ctrlfarm.com.br"})
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                {statusData?.mode === "ONLINE"
                  ? "Validação Online (ADM Gerente :4001)"
                  : "Validação Offline (Assinatura RSA Local)"}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-zinc-800/40 text-[11px] text-zinc-500">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Sincronização horária: <strong className="text-zinc-300">A cada 1 hora</strong> (Tolerância offline: <strong className="text-zinc-300">15 dias</strong>)
              </span>
              <span>
                Última validação:{" "}
                <strong className="text-zinc-300">
                  {statusData?.license?.lastValidatedAt
                    ? new Date(statusData.license.lastValidatedAt).toLocaleString("pt-BR")
                    : "Pendente de sincronização"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Resumo de Cotas do Plano */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-emerald-400" />
              Cotas de Capacidade
            </h3>
            <p className="text-xs text-zinc-400">
              Limites técnicos liberados para o plano contratado
            </p>
          </div>

          <div className="space-y-3 font-sans text-xs">
            <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
              <span className="text-zinc-400">Usuários Permitidos</span>
              <span className="font-bold text-white">
                {features.users === -1 || features.maxUsers === -1
                  ? "Ilimitados"
                  : features.users || features.maxUsers || 1}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
              <span className="text-zinc-400">Impressoras Conectadas</span>
              <span className="font-bold text-white">
                {features.printers === -1 || features.maxPrinters === -1
                  ? "Ilimitadas"
                  : features.printers || features.maxPrinters || 2}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-zinc-950/60 rounded-xl border border-zinc-800/60">
              <span className="text-zinc-400">Múltiplas Empresas</span>
              <span className="font-bold text-white">
                {features.multiCompany ? "Liberado" : "Plano Business+"}
              </span>
            </div>
          </div>

          {!isLicensed && (
            <button
              onClick={() => setShowActivateModal(true)}
              className="w-full py-2.5 text-xs font-semibold text-center text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition shadow-md shadow-emerald-900/40"
            >
              Ativar Assinatura Agora
            </button>
          )}
        </div>
      </div>

      {/* Matriz de Recursos Liberados */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Recursos Disponíveis por Nível de Plano
          </h3>
          <p className="text-xs text-zinc-400">
            Módulos liberados em conformidade com o licenciamento da sua conta
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {[
            {
              name: "Produtos & Filamentos",
              desc: "Catálogo e rastreio de carretéis",
              enabled: isLicensed,
            },
            {
              name: "Estoque & Custos",
              desc: "Controle de insumos e precificação",
              enabled: isLicensed,
            },
            {
              name: "Telemetria de Impressão",
              desc: "Monitoramento em tempo real",
              enabled: isLicensed,
            },
            {
              name: "Marketplace Intelligence",
              desc: "Shopee, Mercado Livre e TikTok Shop",
              enabled: Boolean(features.marketplace || features.allResources),
              badge: "PRO+",
            },
            {
              name: "Gestão de Produção 3D",
              desc: "Filas de peças e operadores",
              enabled: Boolean(features.production || features.allResources),
              badge: "BUSINESS+",
            },
            {
              name: "Matriz de Permissões",
              desc: "Customização granular de acessos",
              enabled: Boolean(features.permissions || features.allResources),
              badge: "BUSINESS+",
            },
            {
              name: "API Externa REST",
              desc: "Integração M2M e webhooks",
              enabled: Boolean(features.api || features.allResources),
              badge: "BUSINESS+",
            },
            {
              name: "Suporte Dedicado",
              desc: "Atendimento prioritário 24/7",
              enabled: Boolean(features.dedicatedSupport || features.allResources),
              badge: "ENTERPRISE",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-xl border transition ${
                item.enabled
                  ? "bg-zinc-950/70 border-emerald-500/30 text-white"
                  : "bg-zinc-950/30 border-zinc-800/60 text-zinc-500 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold">{item.name}</span>
                {item.enabled ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-zinc-600" />
                )}
              </div>
              <p className="text-[11px] text-zinc-400">{item.desc}</p>
              {item.badge && !item.enabled && (
                <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  {item.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ÁREA DE CONTROLE DE ATUALIZAÇÃO */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-400" />
                Área de Controle de Atualização (Software Updates)
              </h3>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                v2.5.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Verifique e aplique novas versões, patches de segurança e melhorias do CTRL-Farm
            </p>
          </div>

          <button
            onClick={handleCheckUpdates}
            disabled={checkingUpdate}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checkingUpdate ? "animate-spin text-emerald-400" : ""}`} />
            {checkingUpdate ? "Consultando Servidor ADM..." : "Verificar Atualizações Agora"}
          </button>
        </div>

        {/* Opção de Atualização Automática vs Manual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => handleToggleAutoUpdate(true)}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              autoUpdateEnabled
                ? "bg-emerald-950/20 border-emerald-500/50 text-white"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <input
                type="radio"
                name="updateMode"
                checked={autoUpdateEnabled}
                onChange={() => handleToggleAutoUpdate(true)}
                className="text-emerald-500 focus:ring-emerald-500"
              />
              <span className="text-sm font-bold block">
                Atualização Automática (Recomendado)
              </span>
            </div>
            <p className="text-xs text-zinc-400 pl-6 leading-relaxed">
              O CTRL-Farm verifica diariamente o Sistema ADM Gerente e baixa correções de segurança
              e patches automaticamente sem interromper a operação.
            </p>
          </div>

          <div
            onClick={() => handleToggleAutoUpdate(false)}
            className={`p-4 rounded-xl border cursor-pointer transition ${
              !autoUpdateEnabled
                ? "bg-amber-950/20 border-amber-500/50 text-white"
                : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <input
                type="radio"
                name="updateMode"
                checked={!autoUpdateEnabled}
                onChange={() => handleToggleAutoUpdate(false)}
                className="text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm font-bold block">
                Atualização Manual
              </span>
            </div>
            <p className="text-xs text-zinc-400 pl-6 leading-relaxed">
              Você decide o momento exato de buscar e instalar novas versões. Notificações visuais
              avisarão quando houver uma nova versão disponível.
            </p>
          </div>
        </div>

        {/* Resultado da Verificação de Atualização */}
        {updateInfo && (
          <div className="pt-2">
            {updateInfo.updateAvailable ? (
              <div className="bg-zinc-950 border border-emerald-500/40 rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      Nova Versão: {updateInfo.latestVersion}
                    </span>
                    {updateInfo.isMandatory && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                        Obrigatória
                      </span>
                    )}
                    {updateInfo.isCritical && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Patch Crítico
                      </span>
                    )}
                  </div>

                  {updateInfo.downloadUrl && (
                    <a
                      href={updateInfo.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar Pacote de Atualização
                    </a>
                  )}
                </div>

                <h4 className="text-sm font-bold text-white">{updateInfo.title}</h4>
                <p className="text-xs text-zinc-300">{updateInfo.description}</p>

                {updateInfo.changelog && updateInfo.changelog.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                      Notas da Versão:
                    </span>
                    <ul className="space-y-1 text-xs text-zinc-300 font-sans">
                      {updateInfo.changelog.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs text-zinc-300">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <strong className="text-white block font-medium">
                    Seu CTRL-Farm está atualizado!
                  </strong>
                  <span>
                    A versão instalada (v2.5.0) é a mais recente disponível no Sistema ADM Gerente.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal - Inserir Chave de Ativação */}
      {showActivateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Ativar Chave de Licença</h3>
              </div>
              <button
                onClick={() => setShowActivateModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActivateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Chave de Ativação Oficial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="CTRL-FARM-XXXX-XXXX-XXXX"
                  value={activationKeyInput}
                  onChange={(e) => setActivationKeyInput(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-base text-white focus:outline-none focus:border-emerald-500 font-mono tracking-wider text-center"
                />
                <p className="text-[11px] text-zinc-500 mt-1.5">
                  Insira a chave oficial de 16 caracteres gerada pelo proprietário no Sistema ADM Gerente.
                </p>
              </div>

              {activationError && (
                <div className="p-3 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-xs">
                  {activationError}
                </div>
              )}

              {activationSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {activationSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowActivateModal(false)}
                  className="px-4 py-2 text-xs text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={activating}
                  className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 transition"
                >
                  {activating ? "Validando Assinatura RSA..." : "Ativar Licença"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
