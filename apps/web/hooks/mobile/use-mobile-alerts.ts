// ==============================================================================
// Hook de Alertas & Notificações Críticas — CTRL Farm Manager Mobile
// Central de avisos com badges, prioridade e ações rápidas
// ==============================================================================

'use client';

import { useState, useCallback } from 'react';

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface MobileAlertItem {
  id: string;
  type: 'FILAMENTO' | 'FALHA' | 'CLIENTE' | 'PAGAMENTO' | 'PEDIDO';
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

export function useMobileAlerts() {
  const [alerts, setAlerts] = useState<MobileAlertItem[]>([
    {
      id: 'alt-01',
      type: 'FALHA',
      severity: 'CRITICAL',
      title: 'Falha de Extrusão na Creality K1 Max #03',
      message: 'O sensor de subextrusão interrompeu o trabalho Suporte_Bancada_Farm.gcode após 38% de conclusão.',
      timestamp: 'Há 12 min',
      read: false,
    },
    {
      id: 'alt-02',
      type: 'FILAMENTO',
      severity: 'WARNING',
      title: 'Estoque Crítico de Filamento PLA Silk Ouro',
      message: 'Restam apenas 90g no carretel atual e não há unidades lacradas na gaveta de estoque.',
      timestamp: 'Há 25 min',
      read: false,
    },
    {
      id: 'alt-03',
      type: 'CLIENTE',
      severity: 'WARNING',
      title: 'Cliente Aguardando Liberação de Licença',
      message: 'Novo cliente "Laboratório Prototipagem 3D" cadastrou sua máquina e aguarda geração da chave RSA.',
      timestamp: 'Há 45 min',
      read: false,
    },
    {
      id: 'alt-04',
      type: 'PEDIDO',
      severity: 'INFO',
      title: 'Novo Pedido B2B Aguardando Aprovação',
      message: 'Pedido #B2B-4402 no valor de R$ 4.800,00 aguarda liberação de limite e desconto comercial.',
      timestamp: 'Há 1 hora',
      read: false,
    },
    {
      id: 'alt-05',
      type: 'PAGAMENTO',
      severity: 'INFO',
      title: 'Fatura de Filamento com Vencimento Próximo',
      message: 'A fatura do fornecedor Esun vence em 5 dias (R$ 1.980,00).',
      timestamp: 'Há 3 horas',
      read: true,
    },
  ]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  const markAsRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  }, []);

  const markAllAsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    alerts,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissAlert,
  };
}
