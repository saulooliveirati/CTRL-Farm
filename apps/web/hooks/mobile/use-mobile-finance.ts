// ==============================================================================
// Hook Financeiro & Fluxo de Caixa — CTRL Farm Manager Mobile
// Métricas executivas de receita, lucro, fluxo de caixa e faturamento
// ==============================================================================

'use client';

import { useState } from 'react';

export interface CashflowPoint {
  date: string;
  label: string;
  receita: number;
  custo: number;
  lucro: number;
}

export function useMobileFinance() {
  const [period, setPeriod] = useState<'7d' | '30d' | 'mes'>('7d');

  // Métricas Consolidadas
  const summary = {
    receitaDia: 1485.50,
    receitaDiaComparacao: +18.4, // +18.4% vs ontem
    receitaMes: 48920.00,
    receitaMesMeta: 60000.00,
    lucroLiquido: 29840.00,
    margemLucroPercent: 61.0,
    contasReceber: 12450.00,
    contasPagar: 4180.00,
    comissoesConsignados: 3240.00,
    mrrAssinaturas: 7890.00,
    totalAssinantes: 42,
    ticketMedio: 185.00,
  };

  // Pontos de fluxo de caixa para gráficos
  const cashflowData7D: CashflowPoint[] = [
    { date: '2026-10-24', label: 'Sex', receita: 1850, custo: 680, lucro: 1170 },
    { date: '2026-10-25', label: 'Sáb', receita: 2420, custo: 890, lucro: 1530 },
    { date: '2026-10-26', label: 'Dom', receita: 1980, custo: 710, lucro: 1270 },
    { date: '2026-10-27', label: 'Seg', receita: 3150, custo: 1120, lucro: 2030 },
    { date: '2026-10-28', label: 'Ter', receita: 2890, custo: 950, lucro: 1940 },
    { date: '2026-10-29', label: 'Qua', receita: 3410, custo: 1240, lucro: 2170 },
    { date: '2026-10-30', label: 'Hoje', receita: 1485, custo: 490, lucro: 995 },
  ];

  const cashflowData30D: CashflowPoint[] = [
    { date: 'Semana 1', label: 'Sem 1', receita: 11200, custo: 4200, lucro: 7000 },
    { date: 'Semana 2', label: 'Sem 2', receita: 13400, custo: 4900, lucro: 8500 },
    { date: 'Semana 3', label: 'Sem 3', receita: 14100, custo: 5100, lucro: 9000 },
    { date: 'Semana 4', label: 'Sem 4', receita: 10220, custo: 3900, lucro: 6320 },
  ];

  // Contas a Pagar Recentes
  const pendingPayables = [
    { id: 'pay-01', description: 'Fornecedor Esun (Lote 20 Bobinas PLA+)', dueDate: '05/11/2026', amount: 1980.00, status: 'Pendente' },
    { id: 'pay-02', description: 'Energia Elétrica Trifásica da Fazenda', dueDate: '10/11/2026', amount: 1420.00, status: 'Agendado' },
    { id: 'pay-03', description: 'Manutenção Preventiva Bicos E3D Revo', dueDate: '12/11/2026', amount: 780.00, status: 'Aguardando Aprovação' },
  ];

  // Contas a Receber Recentes
  const pendingReceivables = [
    { id: 'rec-01', customer: 'Studio Maker Arquitetura', description: 'Maquetes Urbanas em Resina', dueDate: '02/11/2026', amount: 4850.00, status: 'Confirmado' },
    { id: 'rec-02', customer: 'Hospital OdontoTech', description: 'Modelos de Alinhador Ortodôntico', dueDate: '04/11/2026', amount: 3200.00, status: 'Boleto Emitido' },
    { id: 'rec-03', customer: 'Loja Geek Consignação', description: 'Fechamento Mensal Miniaturas', dueDate: '08/11/2026', amount: 2400.00, status: 'Aguardando Conferência' },
  ];

  return {
    period,
    setPeriod,
    summary,
    cashflowData: period === '30d' ? cashflowData30D : cashflowData7D,
    pendingPayables,
    pendingReceivables,
  };
}
