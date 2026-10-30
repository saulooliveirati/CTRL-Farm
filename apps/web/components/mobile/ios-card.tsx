// ==============================================================================
// Componente de Card estilo Apple iOS (Squircle, Glassmorphism e Haptic Press)
// ==============================================================================

'use client';

import React from 'react';

interface IOSCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'surface' | 'glass' | 'highlight' | 'accent';
  interactive?: boolean;
  className?: string;
}

export function IOSCard({
  children,
  variant = 'surface',
  interactive = false,
  className = '',
  ...props
}: IOSCardProps) {
  const baseStyles = 'rounded-3xl p-5 transition-all duration-200 select-none';
  
  const variantStyles = {
    surface: 'bg-white/80 dark:bg-[#121824]/90 border border-slate-200/80 dark:border-white/10 shadow-sm shadow-slate-900/5',
    glass: 'backdrop-blur-xl bg-white/60 dark:bg-[#0f172a]/70 border border-white/20 dark:border-white/10 shadow-md shadow-black/5',
    highlight: 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/40 shadow-sm shadow-emerald-500/10',
    accent: 'bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-500/30 dark:border-cyan-500/40 shadow-sm shadow-cyan-500/10',
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer active:scale-[0.98] active:opacity-95 hover:border-emerald-500/40 dark:hover:border-emerald-400/40'
    : '';

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
