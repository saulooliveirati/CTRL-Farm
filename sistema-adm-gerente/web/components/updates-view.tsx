"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  ShieldAlert,
  Tag,
  FileCode,
} from "lucide-react";

export interface UpdateRelease {
  id: string;
  version: string;
  title: string;
  description: string;
  releaseDate: string;
  changelog: string[] | any;
  isMandatory: boolean;
  isCritical: boolean;
  downloadUrl?: string | null;
  checksumSha256?: string | null;
  minSupportedVersion?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  createdAt: string;
}

export function UpdatesView() {
  const [updates, setUpdates] = useState<UpdateRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [changelogText, setChangelogText] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [checksumSha256, setChecksumSha256] = useState("");

  const loadUpdates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/proxy/updates");
      if (!res.ok) {
        throw new Error("Falha ao carregar versões e atualizações");
      }
      const data = await res.json();
      setUpdates(data);
    } catch (err: any) {
      setError(err.message || "Erro desconhecido ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUpdates();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const changelog = changelogText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const payload = {
        version,
        title,
        description,
        changelog: changelog.length > 0 ? changelog : ["Melhorias de desempenho e estabilidade"],
        isMandatory,
        isCritical,
        downloadUrl: downloadUrl.trim() || undefined,
        checksumSha256: checksumSha256.trim() || undefined,
      };

      const res = await fetch("/api/proxy/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Falha ao publicar atualização");
      }

      setShowModal(false);
      resetForm();
      loadUpdates();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setVersion("");
    setTitle("");
    setDescription("");
    setChangelogText("");
    setIsMandatory(false);
    setIsCritical(false);
    setDownloadUrl("");
    setChecksumSha256("");
  };

  const filteredUpdates = updates.filter(
    (u) =>
      u.version.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowDownCircle className="w-7 h-7 text-emerald-400" />
            Gerenciamento de Atualizações
          </h2>
          <p className="text-sm text-zinc-400">
            Controle de versões, canais de distribuição de patch e changelog do CTRL-Farm
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadUpdates}
            className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-lg shadow-emerald-900/30 transition"
          >
            <Plus className="w-4 h-4" />
            Lançar Nova Versão
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800">
        <Search className="w-5 h-5 text-zinc-500 ml-2" />
        <input
          type="text"
          placeholder="Buscar por versão, título ou conteúdo do release..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none text-white text-sm focus:outline-none w-full"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-zinc-400">
          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
          Carregando histórico de atualizações...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      ) : filteredUpdates.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800/80 rounded-2xl">
          <Tag className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-zinc-300">Nenhuma versão encontrada</h3>
          <p className="text-sm text-zinc-500 mt-1">
            Lance a primeira versão de software para disponibilizar atualizações aos clientes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUpdates.map((item) => {
            const changelogList = Array.isArray(item.changelog)
              ? item.changelog
              : typeof item.changelog === "string"
              ? JSON.parse(item.changelog)
              : [];

            return (
              <div
                key={item.id}
                className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 transition hover:border-zinc-700/80"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-base font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                        {item.version}
                      </span>

                      {item.isMandatory && (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Atualização Obrigatória
                        </span>
                      )}

                      {item.isCritical && (
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Patch Crítico
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(item.releaseDate).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mt-1">{item.title}</h3>
                    <p className="text-sm text-zinc-300 leading-relaxed max-w-3xl">
                      {item.description}
                    </p>
                  </div>

                  {item.downloadUrl && (
                    <a
                      href={item.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg transition border border-zinc-700 self-start"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      Pacote de Instalação
                    </a>
                  )}
                </div>

                {/* Changelog items */}
                {changelogList.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-zinc-800/70">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      Notas de Atualização & Alterações:
                    </p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {changelogList.map((entry: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-zinc-300 bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{entry}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.checksumSha256 && (
                  <div className="mt-3 flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                    <FileCode className="w-3.5 h-3.5 text-zinc-600" />
                    <span>SHA256: {item.checksumSha256}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal - Lançar Versão */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <ArrowDownCircle className="w-6 h-6 text-emerald-400" />
                  Lançar Nova Versão do CTRL-Farm
                </h3>
                <p className="text-xs text-zinc-400">
                  Os clientes conectados receberão notificação de atualização disponível
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Versão (SemVer) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: v2.6.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Título da Versão *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Módulo de IA Marketplace & Telemetria"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Descrição Geral *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Resumo das novidades desta versão..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Notas de Alteração (Changelog) - Uma por linha
                </label>
                <textarea
                  rows={4}
                  placeholder="Novo módulo Marketplace Intelligence&#10;Melhoria no cálculo de kwh&#10;Correção no filtro de materiais"
                  value={changelogText}
                  onChange={(e) => setChangelogText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    URL do Pacote (Download)
                  </label>
                  <input
                    type="url"
                    placeholder="https://releases.ctrlfarm.com.br/..."
                    value={downloadUrl}
                    onChange={(e) => setDownloadUrl(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Checksum SHA-256
                  </label>
                  <input
                    type="text"
                    placeholder="Hash sha256 do instalador..."
                    value={checksumSha256}
                    onChange={(e) => setChecksumSha256(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isMandatory}
                    onChange={(e) => setIsMandatory(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white block">
                      Atualização Obrigatória (Mandatory)
                    </span>
                    <span className="text-xs text-zinc-400">
                      Clientes em versões anteriores serão notificados para atualizar antes de
                      continuar operando.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCritical}
                    onChange={(e) => setIsCritical(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-white block">
                      Patch Crítico de Segurança
                    </span>
                    <span className="text-xs text-zinc-400">
                      Sinaliza correções essenciais de integridade ou vulnerabilidade.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg disabled:opacity-50 transition"
                >
                  {saving ? "Publicando..." : "Publicar Versão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
