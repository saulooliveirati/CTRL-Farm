"use client";

import { useState } from "react";
import {
  X,
  Eye,
  EyeOff,
  Settings2,
  Search,
  Printer,
  Layers,
  Disc3,
  Zap,
  TrendingUp,
  LayoutGrid,
  Check,
} from "lucide-react";
import type { CardConfig, CardId } from "@/types/dashboard-grid";

interface CardManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cardsConfig: Record<CardId, CardConfig>;
  onToggleVisibility: (cardId: CardId) => void;
  onOpenSettings: (cardId: CardId) => void;
}

export function CardManagerDrawer({
  isOpen,
  onClose,
  cardsConfig,
  onToggleVisibility,
  onOpenSettings,
}: CardManagerDrawerProps) {
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const cardList = Object.values(cardsConfig);

  const filteredCards = cardList.filter(
    (card) =>
      card.title.toLowerCase().includes(search.toLowerCase()) ||
      card.subtitle?.toLowerCase().includes(search.toLowerCase()) ||
      card.category.toLowerCase().includes(search.toLowerCase())
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "kpi":
        return <Zap className="w-4 h-4 text-emerald-400" />;
      case "telemetry":
        return <Printer className="w-4 h-4 text-cyan-400" />;
      case "queue":
        return <Layers className="w-4 h-4 text-blue-400" />;
      case "analytics":
        return <TrendingUp className="w-4 h-4 text-purple-400" />;
      default:
        return <LayoutGrid className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case "kpi":
        return "Métricas Operacionais (KPIs)";
      case "telemetry":
        return "Equipamentos & Telemetria";
      case "queue":
        return "Fila & Produção";
      case "analytics":
        return "Analytics & Consumo";
      default:
        return "Outros Cards";
    }
  };

  // Group cards by category
  const categories: ("kpi" | "telemetry" | "queue" | "analytics")[] = [
    "kpi",
    "telemetry",
    "queue",
    "analytics",
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#101827] border-l border-[#263246] shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-[#263246] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#20c997]/10 text-[#20c997] rounded-lg border border-[#20c997]/20">
                <LayoutGrid className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-100">
                  Gerenciador de Cards
                </h2>
                <p className="text-xs text-slate-400">
                  Ative ou oculte módulos no painel principal
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

          {/* Search Bar */}
          <div className="p-4 border-b border-[#263246]/60">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar cards disponíveis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#0a0f1b] border border-[#263246] rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#20c997] transition-colors"
              />
            </div>
          </div>

          {/* Card list grouped by categories */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-[#263246]">
            {categories.map((cat) => {
              const items = filteredCards.filter((c) => c.category === cat);
              if (items.length === 0) return null;

              return (
                <div key={cat} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider px-1">
                    {getCategoryIcon(cat)}
                    <span>{getCategoryTitle(cat)}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      ({items.length})
                    </span>
                  </div>

                  <div className="space-y-2">
                    {items.map((card) => {
                      const isVisible = card.visible;

                      return (
                        <div
                          key={card.id}
                          className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                            isVisible
                              ? "bg-[#151f30] border-[#263246] hover:border-[#20c997]/50"
                              : "bg-[#0d1424]/60 border-[#263246]/40 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-100 truncate">
                                {card.title}
                              </span>
                              {isVisible ? (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  <Check className="w-2.5 h-2.5" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-500/10 text-slate-400 border border-slate-500/30">
                                  Oculto
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {card.subtitle}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Configure Button */}
                            <button
                              onClick={() => onOpenSettings(card.id)}
                              className="p-1.5 rounded-lg bg-[#263246]/60 hover:bg-[#263246] text-slate-300 hover:text-[#20c997] transition-colors"
                              title="Configurar Parâmetros"
                            >
                              <Settings2 className="w-4 h-4" />
                            </button>

                            {/* Visibility Toggle Switch */}
                            <button
                              onClick={() => onToggleVisibility(card.id)}
                              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
                                isVisible
                                  ? "bg-[#20c997]/10 text-[#20c997] hover:bg-[#20c997]/20 border border-[#20c997]/30"
                                  : "bg-[#263246]/50 text-slate-400 hover:text-slate-200 border border-[#263246]"
                              }`}
                              title={isVisible ? "Ocultar Card" : "Exibir Card"}
                            >
                              {isVisible ? (
                                <Eye className="w-4 h-4" />
                              ) : (
                                <EyeOff className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-[#263246] bg-[#0d1424] flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              {cardList.filter((c) => c.visible).length} de {cardList.length} cards visíveis
            </span>

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-[#20c997] hover:bg-[#1db889] text-[#06251e] text-xs font-bold transition-all shadow-lg shadow-[#20c997]/20"
            >
              Concluir Seleção
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
