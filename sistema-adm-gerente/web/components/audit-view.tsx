"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Key,
  LogIn,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
  ArrowDownCircle,
  Eye,
  Terminal,
} from "lucide-react";

export interface AuditEntry {
  id: string;
  action: string;
  performedBy?: string | null;
  adminUserId?: string | null;
  clientId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: any;
  createdAt: string;
  adminUser?: {
    username: string;
    email: string;
  } | null;
  client?: {
    companyName: string;
    tradeName?: string;
  } | null;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  LOGIN: {
    label: "Autenticação ADM",
    color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: LogIn,
  },
  KEY_GENERATED: {
    label: "Chave RSA Gerada",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    icon: Key,
  },
  LICENSE_ACTIVATED: {
    label: "Licença Ativada",
    color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    icon: CheckCircle,
  },
  LICENSE_REVOKED: {
    label: "Licença Revogada",
    color: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: AlertCircle,
  },
  UPDATE_PUBLISHED: {
    label: "Versão Publicada",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    icon: ArrowDownCircle,
  },
  PLAN_CHANGED: {
    label: "Plano Alterado",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Layers,
  },
  CLIENT_CREATED: {
    label: "Cliente Criado",
    color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    icon: CheckCircle,
  },
};

export function AuditView() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const url =
        actionFilter !== "ALL"
          ? `/api/proxy/audit?action=${encodeURIComponent(actionFilter)}&limit=100`
          : `/api/proxy/audit?limit=100`;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Falha ao carregar trilha de auditoria");
      }
      const data = await res.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar auditoria.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter]);

  const filteredLogs = logs.filter((log) => {
    const term = searchTerm.toLowerCase();
    const actionMatch = log.action.toLowerCase().includes(term);
    const byMatch = (log.performedBy || "").toLowerCase().includes(term);
    const ipMatch = (log.ipAddress || "").toLowerCase().includes(term);
    const clientMatch = (log.client?.companyName || "").toLowerCase().includes(term);
    const targetMatch = (log.targetType || "").toLowerCase().includes(term);
    return actionMatch || byMatch || ipMatch || clientMatch || targetMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-7 h-7 text-emerald-400" />
            Trilha de Auditoria & Segurança
          </h2>
          <p className="text-sm text-zinc-400">
            Registro cronológico e imutável de todas as ações sensíveis realizadas no ecossistema
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar Logs
        </button>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
          <Search className="w-5 h-5 text-zinc-500 ml-2" />
          <input
            type="text"
            placeholder="Filtrar por operador, IP, cliente, tipo de ação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none text-white text-sm focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 bg-zinc-900/60 px-3 py-2 rounded-xl border border-zinc-800">
          <Filter className="w-4 h-4 text-zinc-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-transparent text-sm text-zinc-200 border-none focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-zinc-900 text-white">Todas as Ações</option>
            <option value="LOGIN" className="bg-zinc-900 text-white">Logins de Administrador</option>
            <option value="KEY_GENERATED" className="bg-zinc-900 text-white">Geração de Chaves RSA</option>
            <option value="LICENSE_ACTIVATED" className="bg-zinc-900 text-white">Ativação de Licenças</option>
            <option value="UPDATE_PUBLISHED" className="bg-zinc-900 text-white">Lançamento de Versões</option>
            <option value="PLAN_CHANGED" className="bg-zinc-900 text-white">Mudança de Plano</option>
            <option value="CLIENT_CREATED" className="bg-zinc-900 text-white">Cadastro de Clientes</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Carregando registros de auditoria...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-300">Nenhum evento registrado</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Nenhum evento com os filtros especificados foi localizado na trilha de auditoria.
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-zinc-950/60 text-xs uppercase font-medium text-zinc-500 border-b border-zinc-800">
                <tr>
                  <th className="px-6 py-4">Data & Horário</th>
                  <th className="px-6 py-4">Ação</th>
                  <th className="px-6 py-4">Operador / Autor</th>
                  <th className="px-6 py-4">Alvo / Cliente</th>
                  <th className="px-6 py-4">Endereço IP</th>
                  <th className="px-6 py-4 text-right">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-sans">
                {filteredLogs.map((item) => {
                  const actionCfg = ACTION_CONFIG[item.action] || {
                    label: item.action,
                    color: "bg-zinc-700/20 text-zinc-300 border-zinc-700/30",
                    icon: Shield,
                  };
                  const Icon = actionCfg.icon;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/20 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span className="font-mono text-xs">
                            {new Date(item.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${actionCfg.color}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {actionCfg.label}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                        {item.performedBy || item.adminUser?.username || "Sistema (Automático)"}
                      </td>

                      <td className="px-6 py-4 text-zinc-300">
                        {item.client ? (
                          <div>
                            <span className="text-white block font-medium">
                              {item.client.companyName}
                            </span>
                            {item.targetType && (
                              <span className="text-[11px] text-zinc-500 font-mono">
                                {item.targetType}: {item.targetId?.slice(0, 8)}...
                              </span>
                            )}
                          </div>
                        ) : item.targetType ? (
                          <span className="text-xs font-mono text-zinc-400">
                            {item.targetType} {item.targetId ? `(#${item.targetId.slice(0, 8)})` : ""}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-zinc-400">
                        {item.ipAddress || "127.0.0.1"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedEntry(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition border border-emerald-500/20"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Payload
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Detalhes do Payload de Auditoria */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">
                  Detalhes do Evento de Auditoria
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-zinc-950/50 p-3 rounded-xl border border-zinc-800 font-mono">
              <div>
                <span className="text-zinc-500 block">ID do Registro:</span>
                <span className="text-zinc-300">{selectedEntry.id}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Ação:</span>
                <span className="text-emerald-400 font-bold">{selectedEntry.action}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Data / Hora:</span>
                <span className="text-zinc-300">
                  {new Date(selectedEntry.createdAt).toISOString()}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Operador:</span>
                <span className="text-white">
                  {selectedEntry.performedBy || selectedEntry.adminUser?.username || "Sistema"}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">IP de Origem:</span>
                <span className="text-zinc-300">{selectedEntry.ipAddress || "127.0.0.1"}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">User-Agent:</span>
                <span className="text-zinc-400 truncate block">
                  {selectedEntry.userAgent || "Sistema Interno / Backend"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5">
                Payload JSON (Dados Estruturados):
              </span>
              <pre className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-72">
                {JSON.stringify(selectedEntry.details || {}, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
