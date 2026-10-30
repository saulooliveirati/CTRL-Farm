// ==============================================================================
// Hook de Aprovações Rápidas com 1 Toque — CTRL Farm Manager Mobile
// Aprovação de pedidos, cancelamento, liberação de produção, desconto e pagamentos
// ==============================================================================

'use client';

import { useState, useCallback } from 'react';
import { AuditLoggerService } from '@/services/mobile/audit-logger.service';

export type ApprovalType = 'PEDIDO' | 'CANCELAMENTO' | 'PRODUCAO' | 'DESCONTO' | 'PAGAMENTO';

export interface MobileApprovalItem {
  id: string;
  type: ApprovalType;
  title: string;
  description: string;
  requestedBy: string;
  amount?: number;
  discountPercent?: number;
  requestedAt: string;
  urgent: boolean;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
}

export function useMobileApprovals() {
  const [approvals, setApprovals] = useState<MobileApprovalItem[]>([
    {
      id: 'appr-01',
      type: 'DESCONTO',
      title: 'Aprovação de Desconto de 15% em Pedido B2B',
      description: 'Cliente "Tech3D Indústria" solicitou desconto de 15% para fechamento de 50 unidades de carcaças IoT.',
      requestedBy: 'Vendedor: Marcos Silva',
      amount: 4800.00,
      discountPercent: 15,
      requestedAt: '16:10',
      urgent: true,
      status: 'PENDENTE',
    },
    {
      id: 'appr-02',
      type: 'PRODUCAO',
      title: 'Liberação de Ordem de Produção Noturna',
      description: 'Lote de 24x Engrenagens Planetárias em Nylon PA12-CF para a impressora Voron 2.4.',
      requestedBy: 'Operador: Lucas Lima',
      requestedAt: '15:45',
      urgent: false,
      status: 'PENDENTE',
    },
    {
      id: 'appr-03',
      type: 'PAGAMENTO',
      title: 'Liberação de Pagamento Fornecedor de Filamentos',
      description: 'Fatura NF #48209 fornecedor Esun do Brasil no valor de R$ 1.980,00 com vencimento em 05/11.',
      requestedBy: 'Financeiro: Camila Rocha',
      amount: 1980.00,
      requestedAt: '14:20',
      urgent: false,
      status: 'PENDENTE',
    },
    {
      id: 'appr-04',
      type: 'PEDIDO',
      title: 'Aprovação de Pedido Especial Mercado Livre',
      description: 'Pedido #MLB-88492019 acima de R$ 1.000,00 (Dra. Carolina Mendes - Modelos Didáticos Odontológicos).',
      requestedBy: 'Sistema ML Integrador',
      amount: 1250.00,
      requestedAt: '15:40',
      urgent: true,
      status: 'PENDENTE',
    },
    {
      id: 'appr-05',
      type: 'CANCELAMENTO',
      title: 'Solicitação de Cancelamento de Pedido',
      description: 'Cliente desistiu antes da produção da peça #PED-2026-074 (Suporte Headset Rosa Bebê).',
      requestedBy: 'Suporte Atendimento',
      amount: 64.90,
      requestedAt: '12:05',
      urgent: false,
      status: 'PENDENTE',
    },
  ]);

  const approveItem = useCallback((id: string, note?: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'APROVADO' } : item))
    );

    const approvedItem = approvals.find((a) => a.id === id);
    if (approvedItem) {
      AuditLoggerService.getInstance().log({
        action: `APROVADO: ${approvedItem.title}`,
        category: 'APPROVAL',
        actor: { name: 'Saulo Oliveira', role: 'Gerente Geral', id: 'usr-admin-01' },
        target: approvedItem.id,
        details: { type: approvedItem.type, amount: approvedItem.amount, note: note || 'Aprovado via Mobile 1-Toque' },
        status: 'SUCCESS',
      });
    }
  }, [approvals]);

  const rejectItem = useCallback((id: string, reason?: string) => {
    setApprovals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'REJEITADO' } : item))
    );

    const rejectedItem = approvals.find((a) => a.id === id);
    if (rejectedItem) {
      AuditLoggerService.getInstance().log({
        action: `REJEITADO: ${rejectedItem.title}`,
        category: 'APPROVAL',
        actor: { name: 'Saulo Oliveira', role: 'Gerente Geral', id: 'usr-admin-01' },
        target: rejectedItem.id,
        details: { type: rejectedItem.type, reason: reason || 'Rejeitado pelo gerente via mobile' },
        status: 'REJECTED',
      });
    }
  }, [approvals]);

  const pendingCount = approvals.filter((a) => a.status === 'PENDENTE').length;

  return {
    approvals,
    pendingCount,
    approveItem,
    rejectItem,
  };
}
