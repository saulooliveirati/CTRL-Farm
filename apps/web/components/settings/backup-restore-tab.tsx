"use client";

import { useState, useRef, useEffect } from "react";
import {
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Shield,
  Layers,
  Printer,
  Sparkles,
} from "lucide-react";
import type { PublicUser } from "@/lib/auth-types";
import type { CompanyRecord } from "@/lib/server-companies";

interface BackupSummary {
  printers: number;
  filaments: number;
  inventoryMaterials: number;
  products: number;
  productionJobs: number;
  customers: number;
  customerOrders: number;
  suppliers: number;
  pricingEstimates: number;
  cameras: number;
  workshopEquipment: number;
  consignments: number;
  consignmentLocations: number;
  users: number;
}

export function BackupRestoreTab({
  currentUser,
  company,
}: {
  currentUser: PublicUser;
  company?: CompanyRecord | null;
}) {
  const [downloading, setDownloading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<any | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // Results
  const [restoreSuccess, setRestoreSuccess] = useState<{
    message: string;
    restored: Record<string, number>;
  } | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser.role === "ADMIN";

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`ctrlfarm_last_backup_${currentUser.companyId}`);
      if (saved) setLastBackupAt(saved);
    } catch {}
  }, [currentUser.companyId]);

  async function handleDownloadBackup() {
    try {
      setDownloading(true);
      setRestoreError(null);

      const res = await fetch("/api/backup/export");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao exportar o backup do serviço.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const nowStr = new Date().toISOString().slice(0, 10);
      a.download = `ctrlfarm-backup-${company?.name ? company.name.toLowerCase().replace(/\s+/g, "-") : "service"}-${nowStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const nowIso = new Date().toISOString();
      setLastBackupAt(nowIso);
      try {
        localStorage.setItem(`ctrlfarm_last_backup_${currentUser.companyId}`, nowIso);
      } catch {}
    } catch (err: any) {
      setRestoreError(err.message || "Falha no download do backup.");
    } finally {
      setDownloading(false);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParseError(null);
    setRestoreSuccess(null);
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        if (json.system !== "CTRL-Farm") {
          throw new Error("O arquivo selecionado não é um backup oficial do CTRL-Farm.");
        }
        if (!json.entities) {
          throw new Error("Arquivo corrompido: estrutura de entidades não encontrada.");
        }

        setParsedBackup(json);
      } catch (err: any) {
        setParseError(err.message || "Não foi possível processar o arquivo JSON.");
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleExecuteRestore() {
    if (!parsedBackup || !confirmed) return;

    try {
      setUploading(true);
      setRestoreError(null);
      setRestoreSuccess(null);

      const res = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedBackup),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Falha ao restaurar o backup.");
      }

      setRestoreSuccess(data);
      setSelectedFile(null);
      setParsedBackup(null);
      setConfirmed(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setRestoreError(err.message || "Erro inesperado ao restaurar o backup.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header do Módulo */}
      <div className="rounded-3xl border border-slate-800 bg-[#101827] p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[#00df81]">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Backup Completo &amp; Restauração do Serviço
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  Segurança Corporativa
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Exporte ou restaure com 1 clique todos os dados da empresa, incluindo parque de impressão, filamentos, ordens, clientes, produtos e consignações.
              </p>
            </div>
          </div>

          {lastBackupAt && (
            <div className="text-right text-[11px] text-slate-400 font-mono">
              Último backup baixado:{" "}
              <strong className="text-emerald-400">
                {new Date(lastBackupAt).toLocaleString("pt-BR")}
              </strong>
            </div>
          )}
        </div>

        {/* Mensagens de Sucesso e Erro */}
        {restoreSuccess && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-200 animate-in fade-in space-y-3">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              <span>{restoreSuccess.message}</span>
            </div>
            {restoreSuccess.restored && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 text-[11px] font-mono">
                <div>Impressoras: <strong>{restoreSuccess.restored.printers || 0}</strong></div>
                <div>Filamentos: <strong>{restoreSuccess.restored.filaments || 0}</strong></div>
                <div>Produtos: <strong>{restoreSuccess.restored.products || 0}</strong></div>
                <div>Ordens Produção: <strong>{restoreSuccess.restored.productionJobs || 0}</strong></div>
                <div>Clientes: <strong>{restoreSuccess.restored.customers || 0}</strong></div>
                <div>Insumos Almoxarifado: <strong>{restoreSuccess.restored.inventoryMaterials || 0}</strong></div>
                <div>Consignações: <strong>{restoreSuccess.restored.consignments || 0}</strong></div>
                <div>Usuários: <strong>{restoreSuccess.restored.users || 0}</strong></div>
              </div>
            )}
          </div>
        )}

        {restoreError && (
          <div className="mt-5 flex items-center justify-between rounded-2xl border border-rose-900 bg-rose-950/60 p-4 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <span>{restoreError}</span>
            </div>
            <button
              type="button"
              onClick={() => setRestoreError(null)}
              className="text-rose-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Grade de Ações: Exportar e Restaurar */}
        <div className="grid gap-6 md:grid-cols-2 mt-6">
          {/* Card 1: Baixar Backup Completo */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#070c16] p-5 shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
                  <Download className="h-4 w-4" />
                  1. Exportar Dados do Serviço
                </span>
                <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  Formato .JSON
                </span>
              </div>

              <h3 className="text-base font-bold text-white">Baixar Backup Completo</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gera um arquivo compacto e criptograficamente verificado contendo todas as informações da fazenda para segurança, portabilidade e conformidade LGPD.
              </p>

              <div className="rounded-xl border border-slate-800/80 bg-[#0a1120] p-3 text-[11px] text-slate-300 space-y-1.5">
                <span className="font-semibold text-slate-400 block uppercase tracking-wider text-[10px]">
                  Conteúdo do Pacote de Backup:
                </span>
                <ul className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <li className="flex items-center gap-1.5 text-emerald-400">✓ Impressoras 3D</li>
                  <li className="flex items-center gap-1.5 text-emerald-400">✓ Bobinas &amp; Filamentos</li>
                  <li className="flex items-center gap-1.5 text-emerald-400">✓ Almoxarifado / Insumos</li>
                  <li className="flex items-center gap-1.5 text-emerald-400">✓ Fila &amp; Ordens de Produção</li>
                  <li className="flex items-center gap-1.5 text-emerald-400">✓ Produtos &amp; Catálogo</li>
                  <li className="flex items-center gap-1.5 text-emerald-400">✓ Clientes &amp; Orçamentos</li>
                  <li className="flex items-center gap-1.5 text-emerald-400">✓ Módulo de Consignados</li>
                  <li className="flex items-center gap-1.5 text-emerald-400">✓ Configurações &amp; Usuários</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                Empresa: <strong className="text-slate-300">{company?.name || "Atual"}</strong>
              </span>
              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={downloading}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/30 disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Gerando Arquivo...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Baixar Backup Completo</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card 2: Restaurar Backup do Serviço */}
          <div className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#070c16] p-5 shadow-lg">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Upload className="h-4 w-4" />
                  2. Restaurar Dados do Serviço
                </span>
                <span className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  Requer Admin
                </span>
              </div>

              <h3 className="text-base font-bold text-white">Importar e Restaurar Backup</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Carregue um arquivo <code className="text-emerald-400">.json</code> exportado anteriormente para sincronizar os dados da sua empresa com integridade garantida.
              </p>

              {/* Seletor de Arquivo */}
              <div className="rounded-xl border border-dashed border-slate-700 bg-[#0a1120] p-4 text-center">
                <input
                  type="file"
                  accept=".json,application/json"
                  ref={fileInputRef}
                  disabled={!isAdmin || uploading}
                  onChange={handleFileSelected}
                  className="hidden"
                  id="backupFileInput"
                />
                <label
                  htmlFor="backupFileInput"
                  className={`flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    !isAdmin ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  <FileCheck className="h-7 w-7 text-cyan-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    {selectedFile ? selectedFile.name : "Clique para selecionar o arquivo .json"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(1)} KB selecionados`
                      : "Apenas arquivos oficiais gerados pelo CTRL-Farm"}
                  </span>
                </label>
              </div>

              {parseError && (
                <p className="rounded-xl border border-rose-900 bg-rose-950/60 p-2.5 text-[11px] text-rose-300">
                  ⚠ {parseError}
                </p>
              )}

              {/* Resumo do Backup Selecionado */}
              {parsedBackup && (
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Exportado em:</span>
                    <strong className="text-white font-mono">
                      {new Date(parsedBackup.exportedAt).toLocaleString("pt-BR")}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Empresa de Origem:</span>
                    <strong className="text-white">{parsedBackup.company?.name || "N/A"}</strong>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-slate-300 font-mono">
                    <div>{parsedBackup.summary?.printers || 0} Impressoras</div>
                    <div>{parsedBackup.summary?.filaments || 0} Filamentos</div>
                    <div>{parsedBackup.summary?.products || 0} Produtos</div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-cyan-500/20">
                    <input
                      type="checkbox"
                      id="confirmRestore"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                    />
                    <label htmlFor="confirmRestore" className="cursor-pointer text-[11px] text-slate-300 leading-snug">
                      Confirmo que desejo sincronizar os dados da empresa com este backup.
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-end">
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={!isAdmin || !parsedBackup || !confirmed || uploading}
                className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 shadow-md shadow-cyan-950/30 disabled:opacity-40"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Restaurando Dados...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Iniciar Restauração de Dados</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Informativo de Segurança */}
      <div className="rounded-2xl border border-slate-800/80 bg-[#070c16] p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/60 text-slate-300">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Garantia de Integridade e Isolamento Multi-Empresa</h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Cada arquivo de backup possui assinatura hash SHA-256 e suas tabelas são vinculadas estritamente à sua empresa. A restauração nunca interfere em outros clientes do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
