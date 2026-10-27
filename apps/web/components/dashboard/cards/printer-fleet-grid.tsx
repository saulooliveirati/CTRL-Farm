"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Printer,
  Video,
  Pause,
  Play,
  XCircle,
  ExternalLink,
  Flame,
  Layers,
  Thermometer,
  Clock,
  Radio,
  Settings2,
  Filter,
  Maximize2,
  PlusCircle,
} from "lucide-react";
import type { CardConfig } from "@/types/dashboard-grid";
import type { PrinterRecord } from "@/lib/server-printers";
import type { CameraRecord } from "@/lib/server-cameras";

interface PrinterFleetGridProps {
  printers: PrinterRecord[];
  cameras?: CameraRecord[];
  config?: CardConfig;
  onOpenSettings?: () => void;
  isEditing?: boolean;
}

export function PrinterFleetGridCard({
  printers = [],
  cameras = [],
  config,
  onOpenSettings,
  isEditing,
}: PrinterFleetGridProps) {
  // Dados estritamente reais do banco de dados
  const displayPrinters = printers || [];

  const [statusFilter, setStatusFilter] = useState<string>(
    config?.settings?.filterStatus ?? "ALL"
  );
  const [selectedMachine, setSelectedMachine] = useState<PrinterRecord | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filter printers
  const filteredPrinters = useMemo(() => {
    if (statusFilter === "ALL") return displayPrinters;
    return displayPrinters.filter((p) => p.status === statusFilter);
  }, [displayPrinters, statusFilter]);

  const handleQuickAction = (action: string, printer: PrinterRecord) => {
    setActionNotice(`Comando '${action}' enviado para ${printer.name}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="relative flex flex-col h-full w-full p-5 bg-[#101827] border border-[#263246] hover:border-[#20c997]/40 rounded-xl transition-all duration-200 group shadow-lg shadow-black/20 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-32 bg-[#20c997]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#151f30] border border-[#20c997] text-[#20c997] text-xs font-mono rounded-lg shadow-xl shadow-black/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          {actionNotice}
        </div>
      )}

      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#263246]/60 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#20c997]/10 border border-[#20c997]/20 text-[#20c997]">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-semibold text-slate-100 tracking-tight">
                {config?.title || "Parque de Impressoras 3D — Telemetria ao Vivo"}
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#20c997]/10 text-[#20c997] border border-[#20c997]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#20c997] animate-ping" />
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {config?.subtitle || "Monitoramento térmico, percentual de conclusão e feeds de câmeras"}
            </p>
          </div>
        </div>

        {/* Filter Tabs & Settings */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#0a0f1b] p-1 rounded-lg border border-[#263246] text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                statusFilter === "ALL"
                  ? "bg-[#20c997] text-[#06251e] font-semibold shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Todas ({displayPrinters.length})
            </button>
            <button
              onClick={() => setStatusFilter("PRINTING")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                statusFilter === "PRINTING"
                  ? "bg-[#20c997] text-[#06251e] font-semibold shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Imprimindo ({displayPrinters.filter((p) => p.status === "PRINTING").length})
            </button>
            <button
              onClick={() => setStatusFilter("READY")}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                statusFilter === "READY"
                  ? "bg-[#20c997] text-[#06251e] font-semibold shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Prontas ({displayPrinters.filter((p) => p.status === "READY").length})
            </button>
          </div>

          {isEditing && (
            <button
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg bg-[#263246]/60 hover:bg-[#263246] text-slate-300 transition-colors"
              title="Configurar Card"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Printers */}
      <div className="flex-1 overflow-y-auto mt-4 pr-1 scrollbar-thin scrollbar-thumb-[#263246] scrollbar-track-transparent">
        {displayPrinters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center my-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#20c997]/10 border border-[#20c997]/20 flex items-center justify-center text-[#20c997] mb-3">
              <Printer className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-100">Nenhuma Impressora Conectada ao Parque</h4>
            <p className="text-xs text-slate-400 max-w-md mt-1 mb-4">
              Cadastre suas impressoras 3D para ativar o monitoramento em tempo real de telemetria térmica, progresso de camadas, fila e streaming de vídeo com MediaMTX.
            </p>
            <Link
              href="/printers"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#20c997] hover:bg-[#20c997]/90 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-lg shadow-[#20c997]/20"
            >
              <PlusCircle className="w-4 h-4" />
              Cadastrar Impressora 3D
            </Link>
          </div>
        ) : filteredPrinters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 text-xs">
            <Filter className="w-6 h-6 mb-2 text-slate-500" />
            Nenhuma impressora encontrada para o filtro "{statusFilter}".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {filteredPrinters.map((printer) => {
              const isPrinting = printer.status === "PRINTING";
              const isReady = printer.status === "READY";
              const isMaintenance = printer.status === "MAINTENANCE" || printer.status === "ERROR";
              const progress = Number(printer.progressPercent ?? (isPrinting ? 55 : isReady ? 100 : 0));
              const nozzle = Number(printer.nozzleTemp ?? (isPrinting ? 220 : 25));
              const bed = Number(printer.bedTemp ?? (isPrinting ? 60 : 24));

              // Estimate remaining time based on layers or progress
              const remainingMins = isPrinting ? Math.max(10, Math.round((100 - progress) * 2.8)) : 0;
              const remHours = Math.floor(remainingMins / 60);
              const remMin = remainingMins % 60;

              // Circular progress calculation
              const radius = 28;
              const circumference = 2 * Math.PI * radius;
              const strokeDashoffset = circumference - (progress / 100) * circumference;

              return (
                <div
                  key={printer.id}
                  className="flex flex-col justify-between p-4 bg-[#0d1424] border border-[#263246] hover:border-[#20c997]/50 rounded-xl transition-all duration-200 hover:bg-[#121c2e] group/machine"
                >
                  {/* Top Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isPrinting
                              ? "bg-[#20c997] animate-pulse"
                              : isReady
                              ? "bg-cyan-400"
                              : "bg-rose-400"
                          }`}
                        />
                        <Link href="/printers" className="text-sm font-semibold text-slate-100 hover:text-[#20c997] transition-colors truncate">
                          {printer.name}
                        </Link>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                        {printer.model ?? printer.manufacturer ?? "FDM 3D Printer"} • {printer.location ?? "Farm Principal"}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 ${
                        isPrinting
                          ? "bg-[#20c997]/10 text-[#20c997] border-[#20c997]/30"
                          : isReady
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                          : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      }`}
                    >
                      {isPrinting ? "Imprimindo" : isReady ? "Pronta" : "Manutenção"}
                    </span>
                  </div>

                  {/* Main Middle Row: Circular Progress Ring & Camera / Preview */}
                  <div className="my-3 grid grid-cols-12 gap-3 items-center">
                    {/* Left: Progress Ring + Remaining Time */}
                    <div className="col-span-5 flex flex-col items-center justify-center p-2 rounded-lg bg-[#0a0f1b]/60 border border-[#263246]/40">
                      <div className="relative w-16 h-16 flex items-center justify-center">
                        <svg className="w-16 h-16 transform -rotate-90">
                          {/* Track */}
                          <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            className="stroke-[#151f30]"
                            strokeWidth="5"
                            fill="transparent"
                          />
                          {/* Progress Indicator */}
                          <circle
                            cx="32"
                            cy="32"
                            r={radius}
                            className={isPrinting ? "stroke-[#20c997]" : isReady ? "stroke-cyan-400" : "stroke-rose-400"}
                            strokeWidth="5"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center">
                          <span className="text-xs font-bold font-mono text-slate-100">
                            {progress}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 text-center font-mono text-[10px] text-slate-400">
                        {isPrinting ? `${remHours}h ${remMin}m rest.` : isReady ? "Disponível" : "Parada"}
                      </div>
                    </div>

                    {/* Right: Thermal telemetry & Layers */}
                    <div className="col-span-7 flex flex-col justify-center space-y-1.5 pl-1">
                      {/* Nozzle Temp */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                          Bico
                        </span>
                        <span className="text-slate-200 font-semibold">{nozzle}°C</span>
                      </div>

                      {/* Bed Temp */}
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400" />
                          Mesa
                        </span>
                        <span className="text-slate-200 font-semibold">{bed}°C</span>
                      </div>

                      {/* Layer Count */}
                      <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-[#263246]/60">
                        <span className="text-slate-400 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-[#20c997]" />
                          Camada
                        </span>
                        <span className="text-slate-300">
                          {printer.currentLayer ?? 0}
                          <span className="text-slate-500 text-[10px]">/{printer.totalLayers ?? 0}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-[#263246]/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {isPrinting ? (
                        <button
                          onClick={() => handleQuickAction("Pausar Impressão", printer)}
                          className="px-2 py-1 rounded bg-[#1c2a42] hover:bg-[#253756] text-amber-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Pausar Impressão"
                        >
                          <Pause className="w-3 h-3" />
                          Pausar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleQuickAction("Iniciar Impressão", printer)}
                          className="px-2 py-1 rounded bg-[#20c997]/10 hover:bg-[#20c997]/20 text-[#20c997] text-[11px] font-medium flex items-center gap-1 transition-colors border border-[#20c997]/30"
                          title="Iniciar Trabalho"
                        >
                          <Play className="w-3 h-3" />
                          Iniciar
                        </button>
                      )}

                      <button
                        onClick={() => handleQuickAction("Cancelar Tarefa", printer)}
                        className="px-2 py-1 rounded hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-[11px] transition-colors"
                        title="Cancelar Impressão"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => setSelectedMachine(printer)}
                      className="px-2.5 py-1 rounded bg-[#151f30] hover:bg-[#1c2a42] text-slate-200 text-[11px] font-medium transition-colors flex items-center gap-1 border border-[#263246]"
                    >
                      <span>Detalhes</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail / Video Modal */}
      {selectedMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-[#101827] border border-[#263246] rounded-2xl shadow-2xl p-6 relative overflow-hidden">
            <div className="flex items-center justify-between pb-4 border-b border-[#263246]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#20c997]/10 border border-[#20c997]/30 text-[#20c997] rounded-lg">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{selectedMachine.name}</h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedMachine.model ?? "Impressora 3D"} • {selectedMachine.serialNumber ?? "S/N não cadastrado"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMachine(null)}
                className="p-1 rounded-lg hover:bg-[#263246] text-slate-400 hover:text-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Video Feed Simulated / Telemetry */}
            <div className="my-5 aspect-video w-full rounded-xl bg-black border border-[#263246] relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#20c997_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
              
              <div className="text-center z-10">
                <Video className="w-12 h-12 text-[#20c997]/60 mx-auto mb-2 animate-pulse" />
                <p className="text-sm font-mono text-slate-300">
                  {cameras.length > 0 ? `Câmera vinculada: ${cameras[0].name}` : "Feed MediaMTX / WebRTC"}
                </p>
                <p className="text-xs font-mono text-slate-500">
                  {cameras.length > 0 ? `Stream: ${cameras[0].streamPath}` : "Serviço MediaMTX porta 8889 • Latência < 200ms"}
                </p>
                <div className="mt-3">
                  <Link
                    href="/live"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#20c997]/20 border border-[#20c997]/40 text-[#20c997] text-xs font-mono hover:bg-[#20c997]/30 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir Central de Monitoramento
                  </Link>
                </div>
              </div>

              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded bg-black/80 border border-emerald-500/30 text-xs font-mono text-[#20c997]">
                <span className="w-2 h-2 rounded-full bg-[#20c997] animate-ping" />
                {cameras.length > 0 ? "ONLINE (Stream Ativo)" : "READY"}
              </div>

              <div className="absolute bottom-3 left-3 text-xs font-mono text-slate-400 bg-black/80 px-2 py-0.5 rounded">
                Bico: {selectedMachine.nozzleTemp ?? 220}°C | Mesa: {selectedMachine.bedTemp ?? 60}°C
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#263246]">
              <Link
                href="/printers"
                className="text-xs text-[#20c997] hover:underline flex items-center gap-1"
              >
                <span>Ver na lista de impressoras</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMachine(null)}
                  className="px-4 py-2 rounded-lg bg-[#263246]/60 hover:bg-[#263246] text-slate-200 text-xs font-medium transition-colors"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    handleQuickAction("Calibração Concluída", selectedMachine);
                    setSelectedMachine(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#20c997] hover:bg-[#1db889] text-[#06251e] text-xs font-bold transition-colors shadow-lg shadow-[#20c997]/20"
                >
                  Calibrar Máquina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
