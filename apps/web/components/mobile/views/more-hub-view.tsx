// ==============================================================================
// Hub Central de Gestão (IA, Aprovações, Alertas & Segurança) — CTRL Farm Manager Mobile
// Agrupa as ferramentas de alta autoridade executiva em abas fluidas estilo iOS
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { IOSSegmentedControl } from '../ios-segmented-control';
import { AICopilotView } from './ai-copilot-view';
import { ApprovalsView } from './approvals-view';
import { AlertsView } from './alerts-view';
import { SecurityView } from './security-view';

type MoreSubTab = 'ai' | 'approvals' | 'alerts' | 'security';

interface MoreHubViewProps {
  pendingApprovalsCount: number;
  unreadAlertsCount: number;
  onOpenEmergencyLock: () => void;
  isEmergencyLocked: boolean;
  onLockSession: () => void;
  defaultSubTab?: MoreSubTab;
}

export function MoreHubView({
  pendingApprovalsCount,
  unreadAlertsCount,
  onOpenEmergencyLock,
  isEmergencyLocked,
  onLockSession,
  defaultSubTab = 'ai',
}: MoreHubViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<MoreSubTab>(defaultSubTab);

  return (
    <div className="space-y-3">
      {/* Seletor Segmentado Apple no Topo */}
      <div className="px-4">
        <IOSSegmentedControl
          options={[
            { value: 'ai', label: 'IA Copilot' },
            { value: 'approvals', label: 'Aprovações', badge: pendingApprovalsCount },
            { value: 'alerts', label: 'Alertas', badge: unreadAlertsCount },
            { value: 'security', label: 'Segurança' },
          ]}
          value={activeSubTab}
          onChange={(val) => setActiveSubTab(val as MoreSubTab)}
          size="sm"
        />
      </div>

      {/* Conteúdo Dinâmico com Animação Fluida */}
      <div className="animate-in fade-in duration-200">
        {activeSubTab === 'ai' && <AICopilotView />}
        {activeSubTab === 'approvals' && <ApprovalsView />}
        {activeSubTab === 'alerts' && <AlertsView />}
        {activeSubTab === 'security' && (
          <SecurityView
            onOpenEmergencyLock={onOpenEmergencyLock}
            isEmergencyLocked={isEmergencyLocked}
            onLockSession={onLockSession}
          />
        )}
      </div>
    </div>
  );
}
