"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/language-context";
import { Globe, ChevronDown, Check } from "lucide-react";

export function LanguageSelector({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  const { locale, setLocale, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = availableLanguages.find((l) => l.code === locale) || availableLanguages[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Alterar Idioma / Change Language"
        className="flex items-center gap-2 rounded-xl border border-[#263246] bg-[#0c1425]/90 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-[#20c997]/50 hover:text-white shadow-sm active:scale-95"
      >
        <span className="text-sm leading-none">{current.flag}</span>
        {!compact && (
          <span className="hidden sm:inline font-mono tracking-wide">{current.shortLabel}</span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-[#20c997]" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-48 origin-top-right rounded-2xl border border-[#263246] bg-[#0c1322]/98 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 mb-1">
            Idioma / Language
          </div>
          <div className="space-y-0.5">
            {availableLanguages.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLocale(lang.code);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition ${
                    isSelected
                      ? "bg-[#20c997]/15 text-[#20c997] font-semibold border border-[#20c997]/30"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-[#20c997]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
