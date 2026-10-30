// ==============================================================================
// Componente iOS Segmented Control (Apple HIG com Pílula Deslizante)
// ==============================================================================

'use client';

import React from 'react';
import { useHaptics } from '@/hooks/mobile/use-haptics';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  badge?: number | string;
}

interface IOSSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function IOSSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: IOSSegmentedControlProps<T>) {
  const { triggerHaptic } = useHaptics();

  const handleSelect = (newVal: T) => {
    if (newVal !== value) {
      triggerHaptic('selection');
      onChange(newVal);
    }
  };

  const sizeClasses = size === 'sm' ? 'p-0.5 text-xs h-9' : 'p-1 text-xs sm:text-sm h-11';

  return (
    <div
      className={`relative flex items-center w-full rounded-2xl bg-slate-200/70 dark:bg-[#151d2a] p-1 border border-slate-300/40 dark:border-white/5 shadow-inner ${sizeClasses} ${className}`}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleSelect(opt.value)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 h-full rounded-xl font-bold transition-all duration-200 select-none ${
              isSelected
                ? 'bg-white dark:bg-[#20c997] text-slate-900 dark:text-slate-950 shadow-sm shadow-black/10'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected
                    ? 'bg-slate-900/10 dark:bg-black/20 text-slate-900 dark:text-slate-950'
                    : 'bg-emerald-500/20 text-emerald-600 dark:text-brand-neon'
                }`}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
