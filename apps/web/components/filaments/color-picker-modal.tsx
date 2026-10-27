"use client";

import { useEffect, useState } from "react";
import { SpoolGraphic } from "./spool-graphic";

export type ColorPreset = {
  name: string;
  hex: string;
  description?: string;
};

export const FILAMENT_COLOR_PRESETS: ColorPreset[] = [
  // Tons Neutros & Metálicos
  { name: "Preto", hex: "#18181b", description: "Preto clássico / Fosco" },
  { name: "Branco", hex: "#f8fafc", description: "Branco puro / Neve" },
  { name: "Cinza Titânio", hex: "#475569", description: "Cinza médio espacial" },
  { name: "Prata Metálico", hex: "#94a3b8", description: "Prata silk / Alumínio" },
  { name: "Dourado Silk", hex: "#d97706", description: "Ouro silk reluzente" },
  { name: "Bronze Cobre", hex: "#78350f", description: "Cobre antigo / Bronze" },

  // Tons Quentes (Vermelhos, Laranjas, Amarelos)
  { name: "Vermelho Fogo", hex: "#dc2626", description: "Vermelho primário vivo" },
  { name: "Vinho Bordô", hex: "#991b1b", description: "Vermelho escuro elegante" },
  { name: "Laranja Sunset", hex: "#ea580c", description: "Laranja vibrante" },
  { name: "Amarelo Sol", hex: "#eab308", description: "Amarelo canário / Ouro" },

  // Verdes & Menta
  { name: "Verde Esmeralda", hex: "#16a34a", description: "Verde bandeira / Floresta" },
  { name: "Verde Lima", hex: "#84cc16", description: "Verde neon fluorescente" },
  { name: "Verde Menta", hex: "#10b981", description: "Menta pastel suave" },

  // Azuis & Roxos
  { name: "Ciano Elétrico", hex: "#06b6d4", description: "Ciano turquesa brilhante" },
  { name: "Azul Céu", hex: "#0284c7", description: "Azul celeste brilhante" },
  { name: "Azul Royal", hex: "#2563eb", description: "Azul royal tradicional" },
  { name: "Azul Marinho", hex: "#1e3a8a", description: "Azul escuro profundo" },
  { name: "Roxo Neon", hex: "#9333ea", description: "Roxo vibrante ultravioleta" },
  { name: "Rosa Pink", hex: "#ec4899", description: "Rosa choque / Magenta" },

  // Especiais / Naturais
  { name: "Translúcido", hex: "#e0f2fe", description: "Clear / Natural transparente" },
  { name: "Marrom Madeira", hex: "#523626", description: "Marrom café / Wood" },
  { name: "Mármore", hex: "#e2e8f0", description: "Branco rajado / Speckle" },
];

/**
 * Converte qualquer string cadastrada (ex: "Preto", "Azul (#2563eb)", "#10b981")
 * em um objeto com nome amigável e código hexadecimal normalizado.
 */
export function parseColor(rawColor: string | null | undefined): { name: string; hex: string } {
  if (!rawColor || !rawColor.trim()) {
    return { name: "Preto", hex: "#18181b" };
  }

  const trimmed = rawColor.trim();

  // Verifica se contém um código HEX no formato (#XXXXXX) ou #XXXXXX
  const hexMatch = trimmed.match(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hexMatch) {
    let hex = hexMatch[0];
    if (hex.length === 4) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    const cleanName = trimmed.replace(/\s*\(?#[0-9a-fA-F]{3,6}\)?\s*/g, "").trim();
    return {
      name: cleanName || hex.toUpperCase(),
      hex: hex.toLowerCase(),
    };
  }

  // Se for apenas um nome, busca correspondência nos presets conhecidos
  const normalized = trimmed.toLowerCase();
  const presetMatch = FILAMENT_COLOR_PRESETS.find(
    (item) =>
      item.name.toLowerCase() === normalized ||
      normalized.includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(normalized),
  );

  if (presetMatch) {
    return { name: trimmed, hex: presetMatch.hex };
  }

  // Fallback padrão se não encontrar correspondência
  return { name: trimmed, hex: "#64748b" };
}

/**
 * Formata a cor para ser salva no backend.
 * Exemplo: Se o nome for "Azul Céu" e o hex "#0284c7", gera "Azul Céu (#0284c7)".
 * Garante compatibilidade total e cabe com folga no campo `color` (máx. 60 caracteres).
 */
export function formatColorForSave(name: string, hex: string): string {
  const cleanName = name.trim();
  let cleanHex = hex.trim();
  if (!cleanHex.startsWith("#")) {
    cleanHex = `#${cleanHex}`;
  }
  cleanHex = cleanHex.toLowerCase();

  if (!cleanName) {
    return cleanHex;
  }

  if (cleanName.toLowerCase().includes(cleanHex)) {
    return cleanName.slice(0, 60);
  }

  const combined = `${cleanName} (${cleanHex})`;
  return combined.length <= 60 ? combined : cleanName.slice(0, 60);
}

export function ColorPickerModal({
  isOpen,
  initialColor,
  onClose,
  onSelectColor,
}: {
  isOpen: boolean;
  initialColor: string;
  onClose: () => void;
  onSelectColor: (formattedColor: string, parsed: { name: string; hex: string }) => void;
}) {
  const parsed = parseColor(initialColor);
  const [selectedHex, setSelectedHex] = useState(parsed.hex);
  const [colorName, setColorName] = useState(parsed.name);
  const [hexInput, setHexInput] = useState(parsed.hex);

  useEffect(() => {
    if (isOpen) {
      const p = parseColor(initialColor);
      setSelectedHex(p.hex);
      setColorName(p.name);
      setHexInput(p.hex);
    }
  }, [isOpen, initialColor]);

  if (!isOpen) return null;

  function handleSelectPreset(preset: ColorPreset) {
    setSelectedHex(preset.hex);
    setHexInput(preset.hex);
    setColorName(preset.name);
  }

  function handleHexInputChange(value: string) {
    setHexInput(value);
    const cleaned = value.trim().startsWith("#") ? value.trim() : `#${value.trim()}`;
    if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) {
      setSelectedHex(cleaned.toLowerCase());
    }
  }

  function handleNativeColorChange(hex: string) {
    setSelectedHex(hex.toLowerCase());
    setHexInput(hex.toLowerCase());
  }

  function handleConfirm() {
    const validHex = /^#[0-9A-Fa-f]{6}$/.test(selectedHex) ? selectedHex : "#64748b";
    const finalName = colorName.trim() || validHex.toUpperCase();
    const formatted = formatColorForSave(finalName, validHex);
    onSelectColor(formatted, { name: finalName, hex: validHex });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/75 p-3 backdrop-blur-sm animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="color-palette-title"
        className="my-auto max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl sm:p-6"
      >
        {/* Cabeçalho do Seletor */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-emerald-500/20 text-xs text-emerald-400">
                🎨
              </span>
              <h3 id="color-palette-title" className="text-base font-bold text-white">
                Paleta de Cores do Filamento
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Escolha uma cor de referência, selecione no espectro ou digite o código HEX.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Fechar paleta"
          >
            ✕
          </button>
        </div>

        {/* Pré-visualização do Carretel em Tempo Real */}
        <div className="my-4 flex items-center gap-4 rounded-xl border border-slate-800 bg-[#070c16] p-3.5">
          <SpoolGraphic colorHex={selectedHex} ratio={0.85} size={58} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-white/20 shadow-sm"
                style={{ backgroundColor: selectedHex }}
              />
              <span className="truncate text-sm font-bold text-white">
                {colorName || "Sem nome definido"}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="rounded bg-slate-800/80 px-1.5 py-0.5 text-emerald-300">
                {selectedHex.toUpperCase()}
              </span>
              <span>· Pré-visualização em carretel</span>
            </div>
          </div>
        </div>

        {/* Grade de Presets Populares de Impressão 3D */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Cores Recomendadas (3D Printing Standards)
            </span>
            <span className="text-[11px] text-slate-500">{FILAMENT_COLOR_PRESETS.length} tons</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FILAMENT_COLOR_PRESETS.map((preset) => {
              const isSelected = selectedHex.toLowerCase() === preset.hex.toLowerCase();
              return (
                <button
                  key={preset.hex + preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`group flex items-center gap-2.5 rounded-xl border p-2 text-left transition ${
                    isSelected
                      ? "border-emerald-400 bg-emerald-500/15 shadow-sm shadow-emerald-950/40"
                      : "border-slate-800 bg-[#101827] hover:border-slate-700 hover:bg-slate-800/50"
                  }`}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-white/25 shadow-inner transition group-hover:scale-105"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-xs font-medium ${
                        isSelected ? "text-emerald-300 font-bold" : "text-slate-200"
                      }`}
                    >
                      {preset.name}
                    </p>
                    <p className="truncate font-mono text-[10px] text-slate-500">
                      {preset.hex.toUpperCase()}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campos de Ajuste Fino: Nome, HEX e Color Picker Nativo */}
        <div className="mt-5 space-y-3 rounded-xl border border-slate-800 bg-[#101827] p-3.5">
          <span className="block text-xs font-semibold text-slate-300">
            Ajuste Fino ou Cor Personalizada
          </span>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
            <div>
              <label className="text-[11px] font-medium text-slate-400">
                Nome de identificação da cor
              </label>
              <input
                type="text"
                maxLength={40}
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="Ex.: Azul Céu, Preto Matte, Silk Ouro..."
                className="mt-1 h-9 w-full rounded-lg border border-slate-700 bg-[#070c16] px-3 text-xs text-white outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-400">Código HEX (#)</label>
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="text"
                  maxLength={7}
                  value={hexInput}
                  onChange={(e) => handleHexInputChange(e.target.value)}
                  placeholder="#000000"
                  className="h-9 w-full rounded-lg border border-slate-700 bg-[#070c16] px-2.5 font-mono text-xs uppercase text-white outline-none focus:border-emerald-400"
                />
                <label
                  title="Abrir seletor de cores do sistema"
                  className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-700 bg-[#070c16] transition hover:border-slate-500"
                >
                  <input
                    type="color"
                    value={selectedHex}
                    onChange={(e) => handleNativeColorChange(e.target.value)}
                    className="sr-only"
                  />
                  <span
                    className="h-5 w-5 rounded-full border border-white/20 shadow-sm"
                    style={{ backgroundColor: selectedHex }}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 shadow-md shadow-emerald-950/20"
          >
            <span>✓</span>
            Aplicar Cor
          </button>
        </div>
      </div>
    </div>
  );
}
