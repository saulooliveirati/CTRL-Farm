// ==============================================================================
// Tela do Copiloto IA — CTRL Farm Manager Mobile
// Suporte a GPT, Gemini, Hermes, Qwen, DeepSeek, NVIDIA e Ollama
// ==============================================================================

'use client';

import React, { useState } from 'react';
import { IOSCard } from '../ios-card';
import { useMobileAI, AIProvider } from '@/hooks/mobile/use-mobile-ai';
import { useHaptics } from '@/hooks/mobile/use-haptics';
import { Sparkles, Send, Bot, User, CheckCircle2 } from 'lucide-react';

export function AICopilotView() {
  const {
    selectedProvider,
    setSelectedProvider,
    messages,
    isTyping,
    quickPrompts,
    sendMessage,
  } = useMobileAI();

  const [input, setInput] = useState<string>('');
  const { triggerHaptic } = useHaptics();

  const providers: AIProvider[] = [
    'Gemini',
    'GPT',
    'DeepSeek',
    'Qwen',
    'Hermes',
    'NVIDIA',
    'Ollama',
  ];

  const handleSend = () => {
    if (input.trim()) {
      triggerHaptic('medium');
      sendMessage(input);
      setInput('');
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    triggerHaptic('light');
    sendMessage(promptText);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] px-4 pt-1">
      
      {/* Seletor Horizontal de Provedor de IA Estilo Apple Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none shrink-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
          Motor IA:
        </span>
        {providers.map((p) => {
          const isSelected = selectedProvider === p;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setSelectedProvider(p);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 select-none ${
                isSelected
                  ? 'bg-brand-neon text-slate-950 shadow-sm shadow-emerald-500/20'
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-white'
              }`}
            >
              {p === 'Ollama' ? 'Ollama (Local)' : p}
            </button>
          );
        })}
      </div>

      {/* Sugestões de Comandos Rápidos */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-none shrink-0">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleQuickPrompt(qp.text)}
            className="px-3 py-1.5 rounded-2xl bg-white/60 dark:bg-slate-900/70 border border-slate-200/70 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap hover:border-brand-neon active:scale-95 transition"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Área de Mensagens do Chat com Scroll */}
      <div className="flex-1 overflow-y-auto space-y-3.5 py-3 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-3xl p-4 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-md shadow-sm'
                  : 'bg-white/80 dark:bg-[#121824] border border-slate-200/60 dark:border-white/10 text-slate-800 dark:text-slate-200 rounded-bl-md shadow-sm'
              }`}
            >
              {/* Header do Provedor para Respostas da IA */}
              {msg.sender === 'assistant' && msg.provider && (
                <div className="text-[10px] font-mono font-bold text-emerald-500 mb-1 flex items-center gap-1">
                  <span>●</span> Resposta gerada via {msg.provider}
                </div>
              )}

              {/* Conteúdo formatado */}
              <div className="whitespace-pre-line font-sans">{msg.content}</div>

              {/* Botões de Ação na Resposta da IA */}
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-white/10 flex flex-wrap gap-2">
                  {msg.actions.map((act, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuickPrompt(`Executar: ${act.label}`)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-brand-neon border border-emerald-500/30 text-[11px] font-bold active:scale-95 transition"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{act.label}</span>
                    </button>
                  ))}
                </div>
              )}

              <div
                className={`text-[9px] mt-2 text-right ${
                  msg.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium pl-2">
            <span className="w-2 h-2 rounded-full bg-brand-neon animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-brand-neon animate-bounce delay-150" />
            <span className="w-2 h-2 rounded-full bg-brand-neon animate-bounce delay-300" />
            <span className="text-[11px] text-emerald-500 ml-1">
              {selectedProvider} processando dados da farm...
            </span>
          </div>
        )}
      </div>

      {/* Caixa de Entrada Estilo iOS */}
      <div className="shrink-0 pt-2 pb-2">
        <div className="flex items-center gap-2 rounded-2xl bg-white/80 dark:bg-[#121824] border border-slate-200/80 dark:border-white/10 p-1.5 shadow-md">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Comande a farm via ${selectedProvider}...`}
            className="flex-1 bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-brand-neon text-slate-950 flex items-center justify-center disabled:opacity-40 transition active:scale-90 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
