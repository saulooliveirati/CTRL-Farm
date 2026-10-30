// ==============================================================================
// Tela de Produção & Frota de Impressoras 3D — CTRL Farm Manager Mobile
// Status em tempo real (Offline, Aquecendo, Imprimindo, Erro, Finalizada),
// telemetria bico/mesa, câmeras ao vivo e comandos rápidos com haptics
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { IOSCard } from '../ios-card';
import { IOSSegmentedControl } from '../ios-segmented-control';
import { useMobileFarm, PrinterStatus, MobilePrinter } from '@/hooks/mobile/use-mobile-farm';
import { useHaptics } from '@/hooks/mobile/use-haptics';
import {
  Printer,
  Thermometer,
  Video,
  Pause,
  Play,
  Square,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function ProductionView() {
  const { printers, pausePrinter, resumePrinter, abortPrinter } = useMobileFarm();
  const [filterStatus, setFilterStatus] = useState<PrinterStatus | 'TODAS'>('TODAS');
  const [expandedCameraId, setExpandedCameraId] = useState<string | null>(null);
  const { triggerHaptic } = useHaptics();

  const filteredPrinters =
    filterStatus === 'TODAS'
      ? printers
      : printers.filter((p) => p.status === filterStatus);

  const getStatusBadge = (status: PrinterStatus) => {
    switch (status) {
      case 'Imprimindo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Imprimindo
          </span>
        );
      case 'Aquecendo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            Aquecendo
          </span>
        );
      case 'Erro':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Falha / Erro
          </span>
        );
      case 'Finalizada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            Finalizada
          </span>
        );
      case 'Offline':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-slate-500/20 text-slate-400 border border-slate-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Offline
          </span>
        );
    }
  };

  const toggleCamera = (id: string) => {
    triggerHaptic('light');
    setExpandedCameraId(expandedCameraId === id ? null : id);
  };

  return (
    <div className="space-y-4 px-4 pt-2">
      
      {/* Seletor de Filtro de Status */}
      <IOSSegmentedControl
        options={[
          { value: 'TODAS', label: 'Todas', badge: printers.length },
          { value: 'Imprimindo', label: 'Ativas' },
          { value: 'Aquecendo', label: 'Preparo' },
          { value: 'Erro', label: 'Erros' },
        ]}
        value={filterStatus}
        onChange={(val) => setFilterStatus(val as any)}
        size="sm"
      />

      {/* Lista de Impressoras */}
      <div className="space-y-4">
        {filteredPrinters.map((printer) => {
          const isCameraExpanded = expandedCameraId === printer.id;

          return (
            <IOSCard
              key={printer.id}
              variant={printer.status === 'Erro' ? 'highlight' : 'surface'}
              className="space-y-4"
            >
              {/* Header do Card da Impressora */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Printer className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {printer.name}
                    </h3>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {printer.model}
                  </div>
                </div>

                <div>{getStatusBadge(printer.status)}</div>
              </div>

              {/* Mensagem de Erro (quando houver) */}
              {printer.status === 'Erro' && printer.errorMessage && (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3 flex items-start gap-2.5 text-xs text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong className="text-rose-200">Falha Detectada:</strong>{' '}
                    {printer.errorMessage}
                  </div>
                </div>
              )}

              {/* Trabalho Atual & Progresso */}
              {printer.status !== 'Offline' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                      {printer.jobName || 'Sem trabalho ativo'}
                    </span>
                    <span className="font-mono font-extrabold text-slate-900 dark:text-brand-neon">
                      {printer.progress}%
                    </span>
                  </div>

                  {/* Barra de Progresso estilo Apple */}
                  <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        printer.status === 'Erro'
                          ? 'bg-rose-500'
                          : printer.status === 'Aquecendo'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${printer.progress}%` }}
                    />
                  </div>

                  {/* Tempo Restante / ETA */}
                  {printer.timeRemainingMinutes !== undefined && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Restante: {printer.timeRemainingMinutes} min</span>
                      </span>
                      <span>
                        Total: {Math.floor((printer.totalTimeMinutes || 0) / 60)}h{' '}
                        {(printer.totalTimeMinutes || 0) % 60}m
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Telemetria de Temperaturas (Bico e Mesa) */}
              {printer.status !== 'Offline' && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  
                  {/* Bico (Nozzle) */}
                  <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-rose-500" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Bico (Extrusor)
                        </div>
                        <div className="font-mono font-extrabold text-slate-900 dark:text-white">
                          {printer.nozzleTemp}°C{' '}
                          <span className="text-slate-400 font-normal">
                            / {printer.nozzleTarget}°C
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mesa (Bed) */}
                  <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-cyan-400" />
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">
                          Mesa Aquecida
                        </div>
                        <div className="font-mono font-extrabold text-slate-900 dark:text-white">
                          {printer.bedTemp}°C{' '}
                          <span className="text-slate-400 font-normal">
                            / {printer.bedTarget}°C
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Informações de Filamento */}
              <div className="rounded-2xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 p-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                    style={{ backgroundColor: printer.filament.colorHex }}
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {printer.filament.material} • {printer.filament.color}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {printer.filament.spoolBrand}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-[11px]">
                  <span
                    className={`font-bold ${
                      printer.filament.remainingGrams < 100
                        ? 'text-rose-400 font-black'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {printer.filament.remainingGrams}g
                  </span>
                  <div className="text-[10px] text-slate-400">restantes</div>
                </div>
              </div>

              {/* Pré-visualização da Câmera (Quando Disponível) */}
              {printer.cameraUrl && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleCamera(printer.id)}
                    className="w-full flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white py-1"
                  >
                    <span className="flex items-center gap-2 text-cyan-500">
                      <Video className="w-4 h-4" />
                      <span>Câmera da Câmara ao Vivo</span>
                    </span>
                    {isCameraExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {isCameraExpanded && (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-700 bg-black shadow-md animate-in fade-in duration-200">
                      <img
                        src={printer.cameraUrl}
                        alt={`Câmera ao vivo ${printer.name}`}
                        className="w-full h-44 object-cover opacity-90"
                      />
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold text-emerald-400 flex items-center gap-1.5 border border-white/10">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE (MediaMTX RTSP)</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Botões Rápidos de Ação / Controle */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-white/10">
                {printer.status === 'Imprimindo' && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      pausePrinter(printer.id);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/30 py-2.5 text-xs font-bold transition active:scale-95"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </button>
                )}

                {printer.status === 'Aquecendo' && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('medium');
                      resumePrinter(printer.id);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 dark:text-brand-neon border border-emerald-500/30 py-2.5 text-xs font-bold transition active:scale-95"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Retomar</span>
                  </button>
                )}

                {printer.status !== 'Offline' && printer.status !== 'Finalizada' && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('heavy');
                      abortPrinter(printer.id, 'Cancelamento preventivo mobile');
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 dark:text-rose-400 border border-rose-500/30 px-4 py-2.5 text-xs font-bold transition active:scale-95"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Abortar</span>
                  </button>
                )}
              </div>

            </IOSCard>
          );
        })}
      </div>

    </div>
  );
}
