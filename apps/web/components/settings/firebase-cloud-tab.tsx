"use client";

import { useEffect, useState } from "react";
import { useFirebaseNotifications } from "@/hooks/use-firebase-notifications";

interface SyncStats {
  lastSyncAt: string | null;
  status: "IDLE" | "SYNCING" | "SUCCESS" | "ERROR";
  mode: "CLOUD_FIRESTORE" | "LOCAL_STORE_FALLBACK";
  collections: Record<string, number>;
  totalDocuments: number;
  message?: string;
}

interface FirebaseStatusResponse {
  configured: boolean;
  projectId?: string;
  services: {
    storage: {
      available: boolean;
      bucket?: string;
      mode: string;
    };
    firestore: {
      available: boolean;
      mode: string;
    };
    messaging: {
      available: boolean;
      mode: string;
    };
    sync?: {
      available: boolean;
      status: string;
      totalDocuments: number;
      lastSyncAt?: string;
      mode: string;
    };
  };
  syncStats?: SyncStats;
  message?: string;
}

function formatStorageMode(mode?: string, available?: boolean) {
  if (available || mode === "CLOUD_FIREBASE_STORAGE") return "Firebase Cloud Storage";
  if (mode === "LOCAL_DISK_FALLBACK") return "Armazenamento Local (Disco)";
  return mode || "Google Cloud Storage / Local";
}

function formatFirestoreMode(mode?: string, available?: boolean) {
  if (available || mode === "CLOUD_FIRESTORE_REALTIME") return "Cloud Firestore Realtime";
  if (mode === "LOCAL_SQL_POLLING") return "Banco de Dados Local (SQL Polling)";
  return mode || "Google Cloud Firestore";
}

export function FirebaseCloudTab() {
  const [status, setStatus] = useState<FirebaseStatusResponse | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [testingNotification, setTestingNotification] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const { permission, token, requestNotificationPermission } = useFirebaseNotifications();

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      setLoading(true);
      const res = await fetch("/api/firebase/status");
      if (res.ok) {
        const json = await res.json();
        const data = json.data ?? json;
        setStatus(data);
        if (data.syncStats) {
          setSyncStats(data.syncStats);
        }
      }
    } catch (e) {
      console.error("Erro ao obter status do Firebase:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncAll() {
    try {
      setSyncing(true);
      setSyncFeedback("Iniciando transferência completa do banco de dados para o Firebase...");
      const res = await fetch("/api/firebase/sync/all", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncStats(data);
        setSyncFeedback(data.message || "Banco de dados transferido com sucesso para o Firebase!");
        await fetchStatus();
      } else {
        setSyncFeedback(data.message || "Erro durante a transferência de dados.");
      }
    } catch (e: any) {
      setSyncFeedback(`Erro: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  }

  async function handleSendTestPush() {
    try {
      setTestingNotification(true);
      setTestResult(null);
      const res = await fetch("/api/firebase/test-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "🚀 Teste de Notificação CTRL-Farm",
          body: "Integração Firebase Cloud Messaging operacional com sucesso!",
          token: token || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult("Notificação de teste disparada com sucesso!");
      } else {
        setTestResult(data.message || "Notificação simulada via canal local de eventos.");
      }
    } catch (e: any) {
      setTestResult(`Erro: ${e.message}`);
    } finally {
      setTestingNotification(false);
    }
  }

  return (
    <section className="space-y-6">
      {/* Cabeçalho */}
      <div className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4.6 18.2L11.5 5.3a1 1 0 0 1 1.8.1l2.5 4.6-7.3 13a.6.6 0 0 1-.9-.7l1.5-4.1zm14.8.8l-4.7-8.8 2.3-4.2a1 1 0 0 1 1.8.1l4.9 9a.8.8 0 0 1-.3 1l-4 2.9zm-7 1.8l-2.6-4.8 5.6-3.2 4.4 8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Infraestrutura em Nuvem • Firebase
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Arquitetura Híbrida Ativa
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gerenciamento de armazenamento 3D, telemetria em tempo real e notificações push via ecossistema Google Firebase.
              </p>
            </div>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
          >
            <svg
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar Diagnóstico
          </button>
        </div>

        {/* Grade de Módulos Migrados */}
        <div className="grid gap-4 sm:grid-cols-3 mt-6">
          {/* Módulo 1: Cloud Storage */}
          <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Arquivos &amp; 3D
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    status?.services?.storage?.available
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  }`}
                >
                  {status?.services?.storage?.available ? "Nuvem Ativa" : "Fallback Local"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Firebase Cloud Storage</h3>
              <p className="mt-1 text-xs text-slate-400">
                Armazenamento escalável de arquivos STL, 3MF, G-Code e backups de produção com links assinados.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
              Provedor: <span className="text-slate-200">{formatStorageMode(status?.services?.storage?.mode, status?.services?.storage?.available)}</span>
              {status?.services?.storage?.bucket && (
                <div className="truncate text-slate-500 mt-0.5">Bucket: {status.services.storage.bucket}</div>
              )}
            </div>
          </div>

          {/* Módulo 2: Cloud Firestore */}
          <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Telemetria &amp; IoT
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    status?.services?.firestore?.available
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  }`}
                >
                  {status?.services?.firestore?.available ? "Realtime Nuvem" : "Polling Interno"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Cloud Firestore</h3>
              <p className="mt-1 text-xs text-slate-400">
                Sincronização em tempo real de status de impressoras, temperaturas de bico/mesa e progresso de camadas.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
              Provedor: <span className="text-slate-200">{formatFirestoreMode(status?.services?.firestore?.mode, status?.services?.firestore?.available)}</span>
              {status?.projectId && (
                <div className="truncate text-slate-500 mt-0.5">Projeto: {status.projectId}</div>
              )}
            </div>
          </div>

          {/* Módulo 3: Firebase Cloud Messaging */}
          <div className="rounded-2xl border border-slate-800 bg-[#070c16] p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Notificações
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    status?.services?.messaging?.available
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                  }`}
                >
                  {status?.services?.messaging?.available ? "Push Ativo" : "Alertas In-App"}
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Cloud Messaging (FCM)</h3>
              <p className="mt-1 text-xs text-slate-400">
                Notificações push imediatas no navegador para conclusão de peças, fim de filamento e alertas de assinatura.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-slate-400 font-mono">
              Permissão no navegador:{" "}
              <span
                className={`font-bold ${
                  permission === "granted"
                    ? "text-emerald-400"
                    : permission === "denied"
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}
              >
                {permission === "granted"
                  ? "Concedida"
                  : permission === "denied"
                  ? "Negada"
                  : "Pendente"}
              </span>
            </div>
          </div>
        </div>

        {/* Seção de Transferência & Sincronização de Banco de Dados com Firebase */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-[#070c16] p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>⚡</span>
                <span>Transferência de Banco de Dados &amp; Sincronização em Nuvem</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Transfere todas as coleções relacionais (empresas, usuários, impressoras 3D, filamentos, produção, orçamentos e licenças) para o Firebase Firestore.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSyncAll}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:brightness-110 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <svg
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{syncing ? "Transferindo dados..." : "Transferir Banco para Firebase"}</span>
            </button>
          </div>

          {/* Feedback da Operação */}
          {syncFeedback && (
            <div className={`mt-4 rounded-xl p-3 text-xs border ${
              syncStats?.status === "ERROR"
                ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            }`}>
              {syncFeedback}
            </div>
          )}

          {/* Indicadores de Coleções Transferidas */}
          {syncStats && syncStats.collections && (
            <div className="mt-4 pt-4 border-t border-slate-800/60">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-slate-300">
                  Total de Documentos no Firebase: <span className="text-emerald-400 font-bold">{syncStats.totalDocuments}</span>
                </span>
                {syncStats.lastSyncAt && (
                  <span className="text-slate-500">
                    Última sincronização: {new Date(syncStats.lastSyncAt).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {Object.entries(syncStats.collections).map(([name, count]) => (
                  <div key={name} className="rounded-xl border border-slate-800 bg-[#0d1527] p-2.5 text-center">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 truncate">
                      {name === "companies" ? "Empresas" :
                       name === "users" ? "Usuários" :
                       name === "printers" ? "Impressoras 3D" :
                       name === "filaments" ? "Filamentos" :
                       name === "inventoryMaterials" ? "Insumos" :
                       name === "productionJobs" ? "Produção 3D" :
                       name === "customers" ? "Clientes" :
                       name === "suppliers" ? "Fornecedores" :
                       name === "orders" ? "Orçamentos" :
                       name === "projectFiles" ? "Arquivos STL" :
                       name === "sectionTabs" ? "Abas Menu" :
                       name === "userLicenses" ? "Licenças" : name}
                    </span>
                    <span className="text-base font-extrabold text-white mt-0.5 block">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Seção de Ações & Testes */}
        <div className="mt-6 rounded-2xl border border-slate-800/80 bg-[#070c16]/70 p-5">
          <h4 className="text-sm font-bold text-white mb-2">Controles de Notificação &amp; Teste Push</h4>
          <p className="text-xs text-slate-400 mb-4">
            Você pode ativar permissões do navegador para receber alertas mesmo quando a aba do CTRL-Farm estiver em segundo plano.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {permission !== "granted" && (
              <button
                type="button"
                onClick={() => requestNotificationPermission()}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Habilitar Notificações no Navegador
              </button>
            )}

            <button
              type="button"
              onClick={handleSendTestPush}
              disabled={testingNotification}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {testingNotification ? "Disparando..." : "Enviar Push de Teste"}
            </button>
          </div>

          {testResult && (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              {testResult}
            </div>
          )}
        </div>

        {/* Guia de Configuração de Chaves */}
        <div className="mt-6 rounded-2xl border border-slate-800/60 bg-[#070c16]/40 p-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
            Variáveis de Ambiente Recomendadas (.env)
          </h4>
          <p className="text-xs text-slate-400 mb-3">
            O sistema opera automaticamente com resiliência total (usando fallback local seguro se as chaves da nuvem não estiverem preenchidas). Para conectar ao seu projeto oficial do Firebase:
          </p>

          <pre className="rounded-xl bg-[#03060c] p-4 text-[11px] font-mono text-emerald-400 overflow-x-auto border border-slate-900">
{`# Credenciais Firebase Admin SDK (Backend apps/api e sistema-adm-gerente/api)
FIREBASE_PROJECT_ID="seu-projeto-firebase"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@seu-projeto-firebase.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"
FIREBASE_STORAGE_BUCKET="seu-projeto-firebase.appspot.com"

# Credenciais Firebase Web Client (Frontend apps/web)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="seu-projeto-firebase.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu-projeto-firebase"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="seu-projeto-firebase.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef"
NEXT_PUBLIC_FIREBASE_VAPID_KEY="B..."`}
          </pre>
        </div>
      </div>
    </section>
  );
}
