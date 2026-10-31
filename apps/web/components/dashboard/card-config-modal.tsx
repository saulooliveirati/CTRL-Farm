"use client";

import { useState, useEffect } from "react";
import {
  X,
  Settings2,
  Sliders,
  Check,
  Save,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { CardConfig, CardId } from "@/types/dashboard-grid";

interface CardConfigModalProps {
  cardId: CardId | null;
  config: CardConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardId: CardId, partial: Partial<CardConfig>) => void;
}

export function CardConfigModal({
  cardId,
  config,
  isOpen,
  onClose,
  onSave,
}: CardConfigModalProps) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [settings, setSettings] = useState<Record<string, any>>({});

  useEffect(() => {
    if (config) {
      setTitle(config.title || "");
      setSubtitle(config.subtitle || "");
      setSettings(config.settings ? { ...config.settings } : {});
    }
  }, [config, isOpen]);

  if (!isOpen || !cardId || !config) return null;

  const handleSave = () => {
    onSave(cardId, {
      title,
      subtitle,
      settings,
    });
    onClose();
  };

  const updateSetting = (key: string, value: any) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-[#101827] border border-[#263246] rounded-2xl shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#263246]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#20c997]/10 border border-[#20c997]/30 text-[#20c997] rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Configurar Parâmetros
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Card: {cardId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#151f30] hover:bg-[#263246] text-slate-400 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-[#263246]">
          {/* General: Title and Subtitle */}
          <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f1b]/60 border border-[#263246]">
            <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
              Identificação do Card
            </h4>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Título de Exibição</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0d1424] border border-[#263246] rounded-lg text-xs text-slate-200 outline-none focus:border-[#20c997]"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Subtítulo / Descrição Curta</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#0d1424] border border-[#263246] rounded-lg text-xs text-slate-200 outline-none focus:border-[#20c997]"
              />
            </div>
          </div>

          {/* Specific Parameters based on Card Type */}
          {cardId === "kpi-active-printers" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f1b]/60 border border-[#263246]">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Métricas do Parque
              </h4>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Meta de Ocupação da Farm ({settings.targetOccupancy ?? 80}%)
                </label>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={settings.targetOccupancy ?? 80}
                  onChange={(e) => updateSetting("targetOccupancy", Number(e.target.value))}
                  className="w-full accent-[#20c997]"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-300">Exibir barra sutil de capacidade</span>
                <input
                  type="checkbox"
                  checked={settings.showCapacityBar !== false}
                  onChange={(e) => updateSetting("showCapacityBar", e.target.checked)}
                  className="accent-[#20c997] w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {cardId === "kpi-production-queue" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f1b]/60 border border-[#263246]">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Métricas da Fila
              </h4>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Limite de Alerta de Fila Alta ({settings.alertThresholdItems ?? 20} ordens)
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={settings.alertThresholdItems ?? 20}
                  onChange={(e) => updateSetting("alertThresholdItems", Number(e.target.value))}
                  className="w-full accent-[#38bdf8]"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-300">Exibir badge de novos itens do dia</span>
                <input
                  type="checkbox"
                  checked={settings.showTodayBadge !== false}
                  onChange={(e) => updateSetting("showTodayBadge", e.target.checked)}
                  className="accent-[#38bdf8] w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {cardId === "kpi-filament-stock" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f1b]/60 border border-[#263246]">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Limites de Insumos
              </h4>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Limite Mínimo de Estoque Global ({settings.alertThresholdKg ?? 5.0} kg)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  value={settings.alertThresholdKg ?? 5.0}
                  onChange={(e) => updateSetting("alertThresholdKg", Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#0d1424] border border-[#263246] rounded-lg text-xs text-slate-200 outline-none focus:border-amber-400 font-mono"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-300">Exibir badge de alerta em bobinas críticas (&lt; 250g)</span>
                <input
                  type="checkbox"
                  checked={settings.showWarningBadge !== false}
                  onChange={(e) => updateSetting("showWarningBadge", e.target.checked)}
                  className="accent-amber-500 w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {cardId === "kpi-efficiency" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f1b]/60 border border-[#263246]">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Meta de Produtividade
              </h4>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Meta OEE ({settings.targetEfficiency ?? 92}%)
                </label>
                <input
                  type="range"
                  min="60"
                  max="99"
                  step="1"
                  value={settings.targetEfficiency ?? 92}
                  onChange={(e) => updateSetting("targetEfficiency", Number(e.target.value))}
                  className="w-full accent-[#20c997]"
                />
              </div>
            </div>
          )}

          {cardId === "printer-fleet-grid" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f1b]/60 border border-[#263246]">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Visualização do Parque
              </h4>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Filtro de Status Inicial</label>
                <select
                  value={settings.filterStatus ?? "ALL"}
                  onChange={(e) => updateSetting("filterStatus", e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0d1424] border border-[#263246] rounded-lg text-xs text-slate-200 outline-none"
                >
                  <option value="ALL">Todas as Impressoras</option>
                  <option value="PRINTING">Apenas Imprimindo</option>
                  <option value="READY">Apenas Prontas</option>
                </select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-300">Habilitar thumbnail de câmeras ao vivo</span>
                <input
                  type="checkbox"
                  checked={settings.showLiveCamera !== false}
                  onChange={(e) => updateSetting("showLiveCamera", e.target.checked)}
                  className="accent-[#20c997] w-4 h-4 rounded"
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300">Exibir telemetria de bico e mesa</span>
                <input
                  type="checkbox"
                  checked={settings.showTemps !== false}
                  onChange={(e) => updateSetting("showTemps", e.target.checked)}
                  className="accent-[#20c997] w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {cardId === "production-queue-list" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f1b]/60 border border-[#263246]">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Exibição da Fila
              </h4>
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Quantidade Máxima de Itens ({settings.maxItems ?? 6})
                </label>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="1"
                  value={settings.maxItems ?? 6}
                  onChange={(e) => updateSetting("maxItems", Number(e.target.value))}
                  className="w-full accent-[#38bdf8]"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-300">Exibir tag de prioridade (Alta, Média, Baixa)</span>
                <input
                  type="checkbox"
                  checked={settings.showPriorityTag !== false}
                  onChange={(e) => updateSetting("showPriorityTag", e.target.checked)}
                  className="accent-[#38bdf8] w-4 h-4 rounded"
                />
              </div>
            </div>
          )}

          {cardId === "filament-telemetry-chart" && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#0a0f1b]/60 border border-[#263246]">
              <h4 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Gráfico de Consumo
              </h4>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Unidade Padrão</label>
                <select
                  value={settings.unit ?? "kg"}
                  onChange={(e) => updateSetting("unit", e.target.value)}
                  className="w-full px-3 py-1.5 bg-[#0d1424] border border-[#263246] rounded-lg text-xs text-slate-200 outline-none font-mono"
                >
                  <option value="kg">Quilogramas (kg)</option>
                  <option value="g">Gramas (g)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Janela de Dias</label>
                <select
                  value={settings.chartPeriodDays ?? 7}
                  onChange={(e) => updateSetting("chartPeriodDays", Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-[#0d1424] border border-[#263246] rounded-lg text-xs text-slate-200 outline-none font-mono"
                >
                  <option value={7}>7 Dias (Semanal)</option>
                  <option value={14}>14 Dias (Quinzenal)</option>
                  <option value={30}>30 Dias (Mensal)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[#263246] mt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#151f30] hover:bg-[#263246] text-slate-300 text-xs font-medium transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-[#20c997] hover:bg-[#1db889] text-[#06251e] text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg shadow-[#20c997]/20"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}
