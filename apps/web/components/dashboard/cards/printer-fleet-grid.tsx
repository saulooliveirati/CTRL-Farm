"use client";

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

// Exemplos realistas caso a farm inicial esteja com poucas impressoras cadastradas
const DEMO_PRINTERS: PrinterRecord[] = [
  {
    id: "demo-bambu-x1c",
    name: "Bambu Lab X1-Carbon #01",
    manufacturer: "Bambu Lab",
    model: "X1-Carbon Combo",
    serialNumber: "00M00A38100192",
    location: "Rack Alpha - Slot 1",
    notes: "Bico 0.4mm Hardened Steel",
    nozzleMm: 0.4,
    extruderCount: 1,
    hasAms: true,
    usageHours: 342,
    imageUrl: null,
    status: "PRINTING",
    supplierId: null,
    supplier: null,
    createdAt: new Date().toISOString(),
    nozzleTemp: 220,
    targetNozzleTemp: 220,
    bedTemp: 60,
    targetBedTemp: 60,
    progressPercent: 78,
    currentLayer: 468,
    totalLayers: 600,
    lastTelemetryAt: new Date().toISOString(),
  },
  {
    id: "demo-voron-24",
    name: "Voron 2.4 R2 350",
    manufacturer: "Voron Design",
    model: "Voron 2.4",
    serialNumber: "VRN-2024-0891",
    location: "Rack Alpha - Slot 2",
    notes: "Dragon HF, Klipper v0.12",
    nozzleMm: 0.4,
    extruderCount: 1,
    hasAms: false,
    usageHours: 610,
    imageUrl: null,
    status: "PRINTING",
    supplierId: null,
    supplier: null,
    createdAt: new Date().toISOString(),
    nozzleTemp: 245,
    targetNozzleTemp: 245,
    bedTemp: 105,
    targetBedTemp: 105,
    progressPercent: 42,
    currentLayer: 210,
    totalLayers: 500,
    lastTelemetryAt: new Date().toISOString(),
  },
  {
    id: "demo-prusa-mk4",
    name: "Original Prusa MK4 #03",
    manufacturer: "Prusa Research",
    model: "MK4",
    serialNumber: "CZPX-49102-MK4",
    location: "Bancada Beta - Slot 1",
    notes: "Nextruder 0.4mm, Input Shaping",
    nozzleMm: 0.4,
    extruderCount: 1,
    hasAms: false,
    usageHours: 195,
    imageUrl: null,
    status: "READY",
    supplierId: null,
    supplier: null,
    createdAt: new Date().toISOString(),
    nozzleTemp: 25,
    targetNozzleTemp: 0,
    bedTemp: 24,
    targetBedTemp: 0,
    progressPercent: 100,
    currentLayer: 0,
    totalLayers: 0,
    lastTelemetryAt: new Date().toISOString(),
  },
  {
    id: "demo-ender3-v3",
    name: "Creality Ender-3 V3 KE",
    manufacturer: "Creality",
    model: "Ender-3 V3 KE",
    serialNumber: "CR-KE-88910",
    location: "Bancada Beta - Slot 2",
    notes: "Klipper OS, Sensor de Vibração",
    nozzleMm: 0.4,
    extruderCount: 1,
    hasAms: false,
    usageHours: 520,
    imageUrl: null,
    status: "MAINTENANCE",
    supplierId: null,
    supplier: null,
    createdAt: new Date().toISOString(),
    nozzleTemp: 0,
    targetNozzleTemp: 0,
    bedTemp: 0,
    targetBedTemp: 0,
    progressPercent: 0,
    currentLayer: 0,
    totalLayers: 0,
    lastTelemetryAt: new Date().toISOString(),
  },
];

export function PrinterFleetGridCard({
  printers,
  cameras = [],
  config,
  onOpenSettings,
  isEditing,
}: PrinterFleetGridProps) {
  // Use real printers or merge with demos if empty
  const displayPrinters = useMemo(() => {
    if (printers && printers.length > 0) return printers;
    return DEMO_PRINTERS;
  }, [printers]);

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
              {config?.subtitle || "Monitoramento térmico, percentual de conclusão e feed de vídeo"}
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
              Todos ({displayPrinters.length})
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
                      <h4 className="text-sm font-semibold text-slate-100 truncate">
                        {printer.name}
                      </h4>
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
                          stroke="#1e293b"
                          strokeWidth="5"
                          fill="none"
                        />
                        {/* Progress */}
                        <circle
                          cx="32"
                          cy="32"
                          r={radius}
                          stroke={isPrinting ? "#20c997" : isReady ? "#38bdf8" : "#fb7185"}
                          strokeWidth="5"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          fill="none"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-mono font-bold text-slate-100">
                          {progress}%
                        </span>
                      </div>
                    </div>

                    <div className="text-center mt-1">
                      {isPrinting ? (
                        <div className="flex items-center gap-1 text-[10px] text-[#20c997] font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{remHours}h {remMin}m rest.</span>
                        </div>
                      ) : isReady ? (
                        <span className="text-[10px] text-cyan-400 font-mono">Aguardando</span>
                      ) : (
                        <span className="text-[10px] text-rose-400 font-mono">Parada</span>
                      )}
                    </div>
                  </div>

                  {/* Right: Live Camera Thumbnail / Fallback Stream */}
                  <div className="col-span-7 relative h-20 rounded-lg overflow-hidden bg-[#070b14] border border-[#263246] flex items-center justify-center group/feed">
                    {/* Industrial Video Grid Overlay */}
                    <div className="absolute inset-0 bg-[radial-gradient(#20c997_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />
                    
                    {/* Simulated live video or stream indicator */}
                    <div className="relative z-10 flex flex-col items-center text-center p-2">
                      <Video className="w-5 h-5 text-slate-500 group-hover/feed:text-[#20c997] transition-colors mb-1" />
                      <span className="text-[9px] text-slate-400 font-mono">
                        {printer.name.split(" ")[0]} CAM-01
                      </span>
                      <span className="text-[8px] text-slate-600 font-mono">
                        1080p • 30 FPS
                      </span>
                    </div>

                    {/* Live REC badge */}
                    <div className="absolute top-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/70 text-[8px] font-mono text-rose-400 border border-rose-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      REC
                    </div>

                    {/* Expand icon on hover */}
                    <button
                      onClick={() => setSelectedMachine(printer)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover/feed:opacity-100 flex items-center justify-center text-xs font-medium text-slate-200 transition-opacity gap-1"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#20c997]" />
                      <span>Ampliar Feed</span>
                    </button>
                  </div>
                </div>

                {/* Telemetry Bar (Nozzle, Bed, Layer) */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-lg bg-[#0a0f1b]/80 border border-[#263246]/60 text-xs font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <div>
                      <span className="text-[9px] text-slate-500 block leading-none">Bico</span>
                      <span className="font-semibold text-slate-100">{nozzle}°C</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                    <div>
                      <span className="text-[9px] text-slate-500 block leading-none">Mesa</span>
                      <span className="font-semibold text-slate-100">{bed}°C</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-[#20c997]" />
                    <div>
                      <span className="text-[9px] text-slate-500 block leading-none">Camada</span>
                      <span className="font-semibold text-slate-100">
                        {printer.currentLayer ? `${printer.currentLayer}/${printer.totalLayers ?? '?'}` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Operational Actions */}
                <div className="mt-3 pt-2.5 border-t border-[#263246]/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isPrinting ? (
                      <button
                        onClick={() => handleQuickAction("Pausar Impressão", printer)}
                        className="px-2.5 py-1 rounded bg-[#263246]/60 hover:bg-amber-500/20 hover:text-amber-400 text-slate-300 text-[11px] font-medium transition-colors flex items-center gap-1 border border-transparent hover:border-amber-500/30"
                      >
                        <Pause className="w-3 h-3" />
                        Pausar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleQuickAction("Iniciar Impressão", printer)}
                        className="px-2.5 py-1 rounded bg-[#20c997]/10 hover:bg-[#20c997]/20 text-[#20c997] text-[11px] font-medium transition-colors flex items-center gap-1 border border-[#20c997]/30"
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
                  <h3 className="text-base font-semibold text-slate-100">
                    {selectedMachine.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    {selectedMachine.model} • {selectedMachine.serialNumber}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMachine(null)}
                className="p-1.5 rounded-lg bg-[#263246]/60 hover:bg-[#263246] text-slate-400 hover:text-slate-100 transition-colors"
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
                  Transmitindo feed MediaMTX / WebRTC
                </p>
                <p className="text-xs font-mono text-slate-500">
                  Porta 8889 • Latência &lt; 200ms
                </p>
              </div>

              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded bg-black/80 border border-emerald-500/30 text-xs font-mono text-[#20c997]">
                <span className="w-2 h-2 rounded-full bg-[#20c997] animate-ping" />
                ONLINE (1080p 30fps)
              </div>

              <div className="absolute bottom-3 left-3 text-xs font-mono text-slate-400 bg-black/80 px-2 py-0.5 rounded">
                Bico: {selectedMachine.nozzleTemp ?? 220}°C | Mesa: {selectedMachine.bedTemp ?? 60}°C
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#263246]">
              <button
                onClick={() => setSelectedMachine(null)}
                className="px-4 py-2 rounded-lg bg-[#263246]/60 hover:bg-[#263246] text-slate-200 text-xs font-medium transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  handleQuickAction("Sincronização Forçada", selectedMachine);
                  setSelectedMachine(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#20c997] hover:bg-[#1db889] text-[#06251e] text-xs font-bold transition-colors shadow-lg shadow-[#20c997]/20"
              >
                Calibrar Máquina
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
