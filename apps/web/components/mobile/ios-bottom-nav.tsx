// ==============================================================================
// Barra de Navegação Inferior estilo Apple iOS (Bottom Tab Bar com Badges)
// ==============================================================================

'use client';

import React from 'react';
import { LayoutDashboard, Printer, DollarSign, ShoppingBag, Sparkles } from 'lucide-react';
import { useHaptics } from '@/hooks/mobile/use-haptics';

export type MobileTab = 'dashboard' | 'production' | 'finance' | 'marketplace' | 'more';

interface IOSBottomNavProps {
  currentTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  pendingApprovalsCount?: number;
  unreadAlertsCount?: number;
}

export function IOSBottomNav({
  currentTab,
  onTabChange,
  pendingApprovalsCount = 0,
  unreadAlertsCount = 0,
}: IOSBottomNavProps) {
  const { triggerHaptic } = useHaptics();

  const handleSelectTab = (tab: MobileTab) => {
    if (tab !== currentTab) {
      triggerHaptic('selection');
      onTabChange(tab);
    }
  };

  const navItems = [
    {
      id: 'dashboard' as MobileTab,
      label: 'Painel',
      icon: LayoutDashboard,
      badge: 0,
    },
    {
      id: 'production' as MobileTab,
      label: 'Produção',
      icon: Printer,
      badge: 0,
    },
    {
      id: 'finance' as MobileTab,
      label: 'Financeiro',
      icon: DollarSign,
      badge: 0,
    },
    {
      id: 'marketplace' as MobileTab,
      label: 'Vendas',
      icon: ShoppingBag,
      badge: 0,
    },
    {
      id: 'more' as MobileTab,
      label: 'IA & Gestão',
      icon: Sparkles,
      badge: pendingApprovalsCount + unreadAlertsCount,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl bg-white/85 dark:bg-black/85 border-t border-slate-200/60 dark:border-white/10 pb-[env(safe-area-inset-bottom)] transition-colors duration-200">
      <div className="max-w-md mx-auto h-16 flex items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 group select-none transition-transform active:scale-90"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isActive
                      ? 'text-emerald-600 dark:text-brand-neon'
                      : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                  }`}
                  strokeWidth={isActive ? 2.6 : 2}
                />

                {/* Badge de Notificações / Aprovações */}
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white dark:border-black animate-pulse">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] font-semibold mt-1 transition-colors duration-200 ${
                  isActive
                    ? 'text-emerald-700 dark:text-brand-neon font-bold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {item.label}
              </span>

              {/* Indicador de Seleção Sutil no Topo */}
              {isActive && (
                <span className="absolute top-0 w-8 h-0.5 rounded-full bg-emerald-500 dark:bg-brand-neon" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
