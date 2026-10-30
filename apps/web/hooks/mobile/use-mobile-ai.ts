// ==============================================================================
// Hook do Copiloto IA — CTRL Farm Manager Mobile
// Suporte a múltiplos provedores: GPT, Gemini, Hermes, Qwen, DeepSeek, NVIDIA, Ollama
// ==============================================================================

'use client';

import { useState, useCallback } from 'react';

export type AIProvider = 'GPT' | 'Gemini' | 'Hermes' | 'Qwen' | 'DeepSeek' | 'NVIDIA' | 'Ollama';

export interface AIMessage {
  id: string;
  sender: 'user' | 'assistant';
  provider?: AIProvider;
  content: string;
  timestamp: string;
  actions?: { label: string; actionKey: string }[];
}

export function useMobileAI() {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('Gemini');
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'msg-01',
      sender: 'assistant',
      provider: 'Gemini',
      content:
        'Olá, **Saulo**! Sou o seu Copiloto Executivo do **CTRL-Farm**. Analisei as últimas 24 horas da fazenda: **4 impressoras ativas**, **faturamento de R$ 1.485,50** e **1 alerta crítico de subextrusão** na impressora *Creality K1 Max #03*. O que deseja verificar agora?',
      timestamp: '17:15',
      actions: [
        { label: '📊 Resumo do Dia', actionKey: 'daily_summary' },
        { label: '⚠️ Verificar Falhas', actionKey: 'check_errors' },
        { label: '📦 Estoque Baixo', actionKey: 'filament_alert' },
      ],
    },
  ]);

  const quickPrompts = [
    { label: '📊 Resumo do Dia', text: 'Gere um resumo executivo da fazenda hoje com receita, ordens concluídas e gargalos.' },
    { label: '⚠️ Verificar Falhas', text: 'Quais impressoras falharam ou estão aquecendo lentamente hoje?' },
    { label: '🧵 Alerta de Filamento', text: 'Quais bobinas estão abaixo de 100g e precisam de reposição imediata?' },
    { label: '💰 Lucro Estimado', text: 'Qual o lucro estimado dos pedidos de marketplace de hoje?' },
    { label: '📦 Previsão de Compras', text: 'Sugira o lote de compra de filamentos para as próximas duas semanas.' },
  ];

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput.trim()) return;

      const userMsg: AIMessage = {
        id: `user-${Date.now()}`,
        sender: 'user',
        content: userInput,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      // Simulação de resposta inteligente contextualizada da fazenda 3D
      setTimeout(() => {
        let aiReply = '';
        let replyActions: { label: string; actionKey: string }[] | undefined = undefined;

        const lower = userInput.toLowerCase();
        if (lower.includes('resumo') || lower.includes('dia')) {
          aiReply = `### 📊 Resumo Executivo da Farm (${selectedProvider})
- **Receita Hoje:** R$ 1.485,50 (+18,4% vs média diária)
- **Produção:** 5 impressoras com 78% de taxa de ocupação média
- **Ordens:** 3 concluídas, 2 em andamento, 2 aguardando aprovação
- **Gargalo:** *Creality K1 Max #03* pausada por travamento de filamento.
*Recomendação:* Aprovar o pedido B2B de R$ 4.800 para preencher o turno noturno.`;
          replyActions = [
            { label: 'Aprovar Pedido B2B', actionKey: 'approve_b2b' },
            { label: 'Liberar Produção', actionKey: 'start_queue' },
          ];
        } else if (lower.includes('falha') || lower.includes('erro') || lower.includes('k1')) {
          aiReply = `### ⚠️ Diagnóstico da Falha na Creality K1 Max #03
- **Problema:** Sensor de subextrusão acionado às 15:42
- **Causa provável:** O carretel *PLA Silk Ouro* está com nó ou atingiu os últimos 90g com atrito no tubo PTFE.
- **Solução recomendada:** Substituir o carretel ou autorizar corte do filamento para retomar a peça a partir da camada 142.`;
          replyActions = [
            { label: 'Retentar Impressão', actionKey: 'retry_print' },
            { label: 'Abortar Trabalho', actionKey: 'abort_print' },
          ];
        } else if (lower.includes('filamento') || lower.includes('estoque') || lower.includes('compra')) {
          aiReply = `### 🧵 Alertas de Estoque Crítico
- **PLA Silk Ouro:** 90g restantes (Crítico!)
- **PETG Preto Carvão:** 140g restantes (Alerta!)
- **PLA+ Branco:** 1.250g restantes (Normal)
*Sugestão de Compra:* Adicionar 5 bobinas de PLA Silk e 4 de PETG com o fornecedor Esun no valor de R$ 740,00.`;
          replyActions = [
            { label: 'Gerar Ordem de Compra', actionKey: 'create_purchase_order' }
          ];
        } else {
          aiReply = `Análise processada via **${selectedProvider}**: Com base nos dados telemétricos locais, a fazenda está operando com **91,2% de eficiência operacional**. Não há anomalias elétricas detectadas. Temperatura ambiente da câmara média: 26.5°C.`;
        }

        const botMsg: AIMessage = {
          id: `bot-${Date.now()}`,
          sender: 'assistant',
          provider: selectedProvider,
          content: aiReply,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          actions: replyActions,
        };

        setMessages((prev) => [...prev, botMsg]);
        setIsTyping(false);
      }, 1100);
    },
    [selectedProvider]
  );

  return {
    selectedProvider,
    setSelectedProvider,
    messages,
    isTyping,
    quickPrompts,
    sendMessage,
  };
}
