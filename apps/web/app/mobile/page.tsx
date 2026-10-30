// ==============================================================================
// Entrada Principal do Módulo "CTRL Farm Manager Mobile"
// Painel Executivo Mobile-First estilo Apple iOS para Administradores e Gerentes
// ==============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import { IOSShell } from '@/components/mobile/ios-shell';
import { IOSHeader } from '@/components/mobile/ios-header';
import { IOSBottomNav, MobileTab } from '@/components/mobile/ios-bottom-nav';
import { FaceIdModal } from '@/components/mobile/face-id-modal';
import { EmergencyLockModal } from '@/components/mobile/emergency-lock-modal';

// Views Especializadas
import { DashboardView } from '@/components/mobile/views/dashboard-view';
import { ProductionView } from '@/components/mobile/views/production-view';
import { FinanceView } from '@/components/mobile/views/finance-view';
import { MarketplaceView } from '@/components/mobile/views/marketplace-view';
import { MoreHubView } from '@/components/mobile/views/more-hub-view';

// Hooks de Negócio
import { useMobileAuth } from '@/hooks/mobile/use-mobile-auth';
import { useThemeMode } from '@/hooks/mobile/use-theme-mode';
import { useMobileApprovals } from '@/hooks/mobile/use-mobile-approvals';
import { useMobileAlerts } from '@/hooks/mobile/use-mobile-alerts';
import { MobileSocketService, SocketStatus } from '@/services/mobile/mobile-socket.service';

export default function MobileManagerPage() {
  const [currentTab, setCurrentTab] = useState<MobileTab>('dashboard');
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState<boolean>(false);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>('connected');

  // Hooks do Sistema
  const { isDark, toggleTheme } = useThemeMode();
  const {
    user,
    isLocked,
    isEmergencyLocked,
    pinError,
    authenticateWithFaceId,
    authenticateWithPin,
    lockSession,
    toggleEmergencyLock,
  } = useMobileAuth();

  const { pendingCount } = useMobileApprovals();
  const { unreadCount } = useMobileAlerts();

  // Conexão WebSocket
  useEffect(() => {
    const socketService = MobileSocketService.getInstance();
    socketService.connect();
    const unsub = socketService.onStatusChange((status) => {
      setSocketStatus(status);
    });
    return () => unsub();
  }, []);

  const getTabTitle = (tab: MobileTab): string => {
    switch (tab) {
      case 'dashboard':
        return 'Visão Geral Executiva';
      case 'production':
        return 'Produção & Impressoras';
      case 'finance':
        return 'Fluxo de Caixa & Finanças';
      case 'marketplace':
        return 'Vendas & Marketplaces';
      case 'more':
        return 'Hub de Gestão & IA';
      default:
        return 'CTRL Farm Manager';
    }
  };

  return (
    <IOSShell isEmergencyLocked={isEmergencyLocked}>
      {/* Top Header estilo iOS */}
      <IOSHeader
        title={getTabTitle(currentTab)}
        subtitle="CTRL Farm Manager"
        isDark={isDark}
        onToggleTheme={() => toggleTheme(isDark ? 'light' : 'dark')}
        onLockSession={lockSession}
        onOpenEmergencyLock={() => setIsEmergencyModalOpen(true)}
        isEmergencyLocked={isEmergencyLocked}
        isConnected={socketStatus === 'connected'}
      />

      {/* Visualização de Abas Dinâmica */}
      <main className="py-2">
        {currentTab === 'dashboard' && (
          <DashboardView onNavigateTab={(tab) => setCurrentTab(tab)} />
        )}
        {currentTab === 'production' && <ProductionView />}
        {currentTab === 'finance' && <FinanceView />}
        {currentTab === 'marketplace' && <MarketplaceView />}
        {currentTab === 'more' && (
          <MoreHubView
            pendingApprovalsCount={pendingCount}
            unreadAlertsCount={unreadCount}
            onOpenEmergencyLock={() => setIsEmergencyModalOpen(true)}
            isEmergencyLocked={isEmergencyLocked}
            onLockSession={lockSession}
          />
        )}
      </main>

      {/* Barra de Navegação Inferior (Bottom Tab Bar) */}
      <IOSBottomNav
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        pendingApprovalsCount={pendingCount}
        unreadAlertsCount={unreadCount}
      />

      {/* Modal de Autenticação Biométrica Face ID / PIN */}
      <FaceIdModal
        isOpen={isLocked}
        userName={user.name}
        onAuthenticateFaceId={authenticateWithFaceId}
        onAuthenticatePin={authenticateWithPin}
        pinError={pinError}
      />

      {/* Modal de Parada de Emergência da Farm */}
      <EmergencyLockModal
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
        onConfirmLock={(reason) => toggleEmergencyLock(true, reason)}
      />
    </IOSShell>
  );
}
