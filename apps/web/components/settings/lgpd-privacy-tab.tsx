"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Download, Trash2, Lock, FileCheck2, Info, RefreshCw } from "lucide-react";

interface LgpdPrivacyTabProps {
  currentUserId?: string;
  companyId?: string;
}

export function LgpdPrivacyTab({ currentUserId, companyId }: LgpdPrivacyTabProps) {
  const [consents, setConsents] = useState<Record<string, boolean>>({
    TERMS_AND_PRIVACY: true,
    DATA_PROCESSING: true,
    OPERATIONAL_NOTIFICATIONS: true,
  });
  const [loadingConsent, setLoadingConsent] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [anonReason, setAnonReason] = useState("");
  const [requestingAnon, setRequestingAnon] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  // Load consents on mount
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/lgpd/status");
        if (res.ok) {
          const json = await res.json();
          if (json.data?.consents) {
            setConsents((prev) => ({ ...prev, ...json.data.consents }));
          }
        }
      } catch {
        // Fallback silencioso
      }
    }
    loadStatus();
  }, []);

  const handleToggleConsent = async (consentType: string, currentVal: boolean) => {
    setLoadingConsent(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/lgpd/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consentType,
          granted: !currentVal,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Falha ao registrar consentimento.");

      setConsents((prev) => ({ ...prev, [consentType]: !currentVal }));
      setStatusMsg({
        type: "success",
        text: `Preferencia de consentimento atualizada com sucesso (${new Date().toLocaleTimeString()}).`,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao atualizar consentimento.",
      });
    } finally {
      setLoadingConsent(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/lgpd/export-my-data");
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Erro ao gerar exportação.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dados-pessoais-ctrlfarm-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      setStatusMsg({
        type: "success",
        text: "Exportação de dados concluída! O arquivo JSON foi baixado para o seu dispositivo.",
      });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Falha ao exportar dados.",
      });
    } finally {
      setExporting(false);
    }
  };

  const handleRequestAnonymization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anonReason.trim()) {
      setStatusMsg({ type: "error", text: "Informe a motivação para a solicitação." });
      return;
    }
    if (
      !confirm(
        "Atenção: A anonimização ou exclusão definitiva de dados pessoais é irreversível. Deseja registrar esta solicitação formal?",
      )
    ) {
      return;
    }

    setRequestingAnon(true);
    setStatusMsg(null);
    try {
      const res = await fetch("/api/lgpd/request-anonymization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: anonReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Falha ao registrar solicitação.");

      setAnonReason("");
      setStatusMsg({
        type: "success",
        text: "Solicitação de anonimização registrada com sucesso sob protocolo LGPD. Nossa equipe entrará em contato em até 15 dias úteis.",
      });
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Erro ao registrar solicitação.",
      });
    } finally {
      setRequestingAnon(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de status */}
      {statusMsg && (
        <div
          className={`rounded-xl border p-4 text-xs font-medium backdrop-blur-md animate-in fade-in ${
            statusMsg.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Header Informativo da LGPD */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Conformidade LGPD & Segurança de Dados Pessoais
            </h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o
              CTRL-Farm assegura a transparência, privacidade e controle absoluto sobre os seus
              dados. Aqui você pode gerenciar consentimentos, exercer o direito de portabilidade e
              solicitar exclusão de informações.
            </p>
          </div>
        </div>

        {/* Pilares de Segurança */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3.5">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
              <Lock className="h-4 w-4" />
              <span>Criptografia & 2FA</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Tráfego HTTPS com TLS 1.3, senhas protegidas com hash Bcrypt e 2FA TOTP disponível.
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3.5">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <FileCheck2 className="h-4 w-4" />
              <span>Isolamento Multi-Tenant</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Cada fazenda 3D possui isolamento lógico por companyId, impedindo acesso indevido.
            </p>
          </div>

          <div className="rounded-xl border border-white/5 bg-slate-950/40 p-3.5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <Info className="h-4 w-4" />
              <span>RBAC em 4 Níveis</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Permissões estritas: Padrão, Operação, Moderador e Administrador em cada rota.
            </p>
          </div>
        </div>
      </section>

      {/* Bloco 1: Gestão de Consentimentos (Art. 7º e 8º da LGPD) */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <span>📜</span>
          <span>Gestão de Consentimentos (Art. 7º e 8º da LGPD)</span>
        </h4>
        <p className="mt-1 text-xs text-slate-400">
          Você pode habilitar ou desabilitar o processamento de dados para fins específicos a
          qualquer momento.
        </p>

        <div className="mt-4 space-y-3">
          {/* Termos & Política */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-xs">
                  Termos de Uso e Política de Privacidade da Plataforma
                </span>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  Obrigatório
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Necessário para autenticação, controle de acesso e auditoria das impressoras 3D.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-emerald-400">Ativo</span>
            </div>
          </div>

          {/* Processamento de Dados de Produção */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex-1">
              <span className="font-semibold text-white text-xs">
                Processamento Analítico de Produção e Custos (Calculadora & Estoque)
              </span>
              <p className="mt-1 text-[11px] text-slate-400">
                Permite à IA calcular tempo médio de impressão, desgaste de bicos e sugestão de
                precificação.
              </p>
            </div>
            <button
              type="button"
              disabled={loadingConsent}
              onClick={() =>
                handleToggleConsent("DATA_PROCESSING", consents.DATA_PROCESSING ?? true)
              }
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                consents.DATA_PROCESSING
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border border-white/10 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {consents.DATA_PROCESSING ? "Consentido ✓" : "Revogado ✕"}
            </button>
          </div>

          {/* Notificações Operacionais */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/40 p-4">
            <div className="flex-1">
              <span className="font-semibold text-white text-xs">
                Notificações de Fim de Impressão, Alertas Térmicos e WhatsApp
              </span>
              <p className="mt-1 text-[11px] text-slate-400">
                Envio de avisos quando a peça for finalizada ou quando o filamento acabar.
              </p>
            </div>
            <button
              type="button"
              disabled={loadingConsent}
              onClick={() =>
                handleToggleConsent(
                  "OPERATIONAL_NOTIFICATIONS",
                  consents.OPERATIONAL_NOTIFICATIONS ?? true,
                )
              }
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                consents.OPERATIONAL_NOTIFICATIONS
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border border-white/10 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {consents.OPERATIONAL_NOTIFICATIONS ? "Consentido ✓" : "Revogado ✕"}
            </button>
          </div>
        </div>
      </section>

      {/* Bloco 2: Portabilidade dos Dados (Art. 18, V) */}
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="h-4 w-4 text-cyan-400" />
              <span>Direito de Portabilidade de Dados (Art. 18, V)</span>
            </h4>
            <p className="mt-1 text-xs text-slate-400 max-w-xl">
              Baixe uma cópia integral de todos os seus dados pessoais, histórico de login,
              registros de pedidos, ordens de serviço e preferências cadastrados no sistema em
              formato aberto padronizado (JSON).
            </p>
          </div>

          <button
            type="button"
            disabled={exporting}
            onClick={handleExportData}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all shrink-0 disabled:opacity-50"
          >
            {exporting ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            <span>{exporting ? "Gerando Pacote..." : "Exportar Meus Dados"}</span>
          </button>
        </div>
      </section>

      {/* Bloco 3: Eliminação & Anonimização (Art. 18, VI) */}
      <section className="rounded-2xl border border-rose-500/20 bg-rose-950/10 p-6 backdrop-blur-md">
        <div>
          <h4 className="text-sm font-bold text-rose-300 flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-rose-400" />
            <span>Direito à Eliminação ou Anonimização de Dados (Art. 18, VI)</span>
          </h4>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Caso deseje encerrar seu vínculo ou solicitar a exclusão / desidentificação de dados
            pessoais armazenados, preencha o motivo abaixo para abertura de solicitação com registro
            de auditoria legal:
          </p>
        </div>

        <form onSubmit={handleRequestAnonymization} className="mt-4 space-y-3">
          <textarea
            required
            rows={2}
            placeholder="Informe a motivação da solicitação de anonimização ou exclusão..."
            value={anonReason}
            onChange={(e) => setAnonReason(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none resize-none"
          />

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={requestingAnon || !anonReason.trim()}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-white transition-all disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{requestingAnon ? "Registrando..." : "Solicitar Anonimização / Exclusão"}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
