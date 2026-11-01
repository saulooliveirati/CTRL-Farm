"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function LandingPage() {
  const [detectedOs, setDetectedOs] = useState<"windows" | "mac" | "other">("other");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      const platform = (window.navigator as any).userAgentData?.platform?.toLowerCase() || window.navigator.platform?.toLowerCase() || "";

      if (ua.includes("win") || platform.includes("win")) {
        setDetectedOs("windows");
      } else if (ua.includes("mac") || platform.includes("mac") || ua.includes("darwin")) {
        setDetectedOs("mac");
      } else {
        setDetectedOs("other");
      }
    }
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedLink(label);
      setTimeout(() => setCopiedLink(null), 2500);
    }
  };

  const WINDOWS_URL = "https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm-Setup.exe";
  const MAC_URL = "https://github.com/saulooliveirati/CTRL-Farm/releases/latest/download/CTRL-Farm.dmg";

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-[#20c997] selection:text-slate-950 font-sans">
      
      {/* ================= 1. NAVBAR OFICIAL ================= */}
      <header className="sticky top-0 z-50 border-b border-[#151e30] bg-[#070b14]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#20c997] to-teal-800 p-0.5 shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0a0f1b]">
                <svg width="22" height="22" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 10L54 22L32 34L10 22L32 10Z" stroke="#20c997" strokeWidth="3" strokeLinejoin="round"/>
                  <path d="M10 22V46L32 58V34" stroke="#20c997" strokeWidth="3" strokeLinejoin="round"/>
                  <path d="M54 22V46L32 58" stroke="#20c997" strokeWidth="3" strokeLinejoin="round"/>
                  <circle cx="32" cy="35" r="4" fill="#38bdf8"/>
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-extrabold tracking-tight text-white">
                CTRL<span className="text-[#20c997]">+Farm</span>
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#recursos" className="text-sm font-medium text-slate-300 hover:text-[#20c997] transition">
              Recursos
            </a>
            <a href="#monitoramento" className="text-sm font-medium text-slate-300 hover:text-[#20c997] transition">
              Monitoramento
            </a>
            <a href="#downloads" className="text-sm font-medium text-slate-300 hover:text-[#20c997] transition">
              Downloads
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl border border-[#263246] bg-[#0d1527] px-4 py-2 text-xs sm:text-sm font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition shadow-sm"
            >
              Acessar o Sistema
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-[#20c997] px-4 py-2 text-xs sm:text-sm font-bold text-slate-950 shadow-md shadow-emerald-950/40 hover:brightness-110 transition active:scale-95"
            >
              Cadastre-se
            </Link>
          </div>

        </div>
      </header>

      {/* ================= 2. HERO SECTION COM MOCKUP 3D ================= */}
      <section className="relative overflow-hidden pt-14 pb-20 sm:pt-20 sm:pb-28">
        
        {/* Glow e Partículas de Fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-gradient-to-b from-[#20c997]/15 via-[#101827]/40 to-transparent blur-[120px] pointer-events-none -z-10" />

        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          
          {/* Título Principal em 2 Linhas */}
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.15]">
            A Plataforma Completa para <br />
            <span className="text-[#20c997]">
              Fazendas de Impressão 3D
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base text-slate-400 leading-relaxed font-normal">
            Monitore, gerencie e otimize sua operação 3D em tempo real, com telemetria avançada, controle de filamentos e automação inteligente.
          </p>

          {/* Botões de Ação do Hero */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-full bg-[#20c997] px-8 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/60 hover:brightness-110 transition active:scale-95"
            >
              Cadastre-se Grátis
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#263246] bg-[#0d1629]/80 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:border-slate-600 transition"
            >
              <span>Acessar o Sistema</span>
              <span>→</span>
            </Link>
          </div>

          {/* Badge Informativo de Aplicativo Desktop */}
          <div className="mt-6 flex justify-center">
            <a
              href="#downloads"
              className="inline-flex items-center gap-2 rounded-full border border-[#1e293b] bg-[#0c1425]/80 px-5 py-2 text-xs text-slate-300 hover:border-[#20c997]/50 hover:text-white transition shadow-sm"
            >
              <span>💻</span>
              <span>Aplicativo Desktop para Windows (.exe) e macOS (.dmg)</span>
            </a>
          </div>

        </div>

        {/* ================= 3. MOCKUP 3D ISOMÉTRICO FLUTUANTE ================= */}
        <div className="relative mx-auto mt-12 sm:mt-16 max-w-5xl px-4 sm:px-6">
          
          {/* Glow Neon embaixo do Mockup 3D */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[320px] bg-gradient-to-r from-emerald-500/20 via-[#20c997]/30 to-cyan-500/20 blur-[90px] pointer-events-none -z-10" />

          {/* Container em Perspectiva 3D */}
          <div className="mx-auto max-w-4xl [perspective:1200px]">
            <div className="transform-gpu [transform:rotateX(42deg)_rotateZ(-16deg)] hover:[transform:rotateX(36deg)_rotateZ(-10deg)] transition-transform duration-700 rounded-3xl border border-[#20c997]/35 bg-[#0b1322]/95 p-4 sm:p-6 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.95),0_0_50px_rgba(32,201,151,0.25)] backdrop-blur-2xl">
              
              {/* Barra Superior da Janela Simulada */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4 text-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="flex h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-3 font-bold text-white tracking-wide">CTRL+Farm</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">Dashboard</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-[11px] border border-slate-800">
                    <span>🔍</span>
                    <span>Buscar impressora ou arquivo...</span>
                  </div>
                  <span className="h-6 w-6 rounded-full bg-[#20c997]/20 border border-[#20c997]/40 flex items-center justify-center text-[10px] text-[#20c997] font-bold">
                    CF
                  </span>
                </div>
              </div>

              {/* Grid Interno do Dashboard: Sidebar + Cards */}
              <div className="grid grid-cols-12 gap-4">
                
                {/* Menu Lateral Miniatura */}
                <div className="col-span-3 space-y-1.5 border-r border-slate-800/60 pr-3">
                  <div className="flex items-center gap-2 rounded-lg bg-[#20c997]/15 px-2.5 py-1.5 text-[11px] font-bold text-[#20c997] border-l-2 border-[#20c997]">
                    <span>📊</span>
                    <span>Dashboard</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200">
                    <span>🖨️</span>
                    <span>Impressoras</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200">
                    <span>📹</span>
                    <span>Dispositivos</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200">
                    <span>🧵</span>
                    <span>Filamentos</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200">
                    <span>📦</span>
                    <span>Estoque</span>
                  </div>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-200">
                    <span>⚙️</span>
                    <span>Acessar Sessão</span>
                  </div>
                </div>

                {/* Área de Conteúdo com os Anéis Neon das Impressoras */}
                <div className="col-span-9 space-y-4">
                  
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-white">3D Printers Status</h4>
                    <span className="text-[10px] text-emerald-400 font-mono">● 4 Operacionais</span>
                  </div>

                  {/* Grid de Impressoras */}
                  <div className="grid grid-cols-2 gap-3">
                    
                    {/* Impressora 1 (Verde) */}
                    <div className="rounded-xl border border-slate-800 bg-[#0d1629] p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-white">3D Printer 1</div>
                        <div className="text-[9px] text-emerald-400">● Imprimindo</div>
                        <div className="text-[9px] text-slate-400 mt-1">210°C / 60°C</div>
                      </div>
                      {/* Anel SVG Circular 80% */}
                      <div className="relative flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="18" stroke="#1e293b" strokeWidth="3" fill="transparent"/>
                          <circle cx="24" cy="24" r="18" stroke="#20c997" strokeWidth="3" strokeDasharray="113" strokeDashoffset="22" strokeLinecap="round" fill="transparent"/>
                        </svg>
                        <span className="absolute text-[10px] font-bold text-white">80%</span>
                      </div>
                    </div>

                    {/* Impressora 2 (Verde) */}
                    <div className="rounded-xl border border-slate-800 bg-[#0d1629] p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-white">3D Printer 2</div>
                        <div className="text-[9px] text-emerald-400">● Imprimindo</div>
                        <div className="text-[9px] text-slate-400 mt-1">215°C / 60°C</div>
                      </div>
                      {/* Anel SVG Circular 70% */}
                      <div className="relative flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="18" stroke="#1e293b" strokeWidth="3" fill="transparent"/>
                          <circle cx="24" cy="24" r="18" stroke="#22c55e" strokeWidth="3" strokeDasharray="113" strokeDashoffset="34" strokeLinecap="round" fill="transparent"/>
                        </svg>
                        <span className="absolute text-[10px] font-bold text-white">70%</span>
                      </div>
                    </div>

                    {/* Impressora 3 (Laranja) */}
                    <div className="rounded-xl border border-slate-800 bg-[#0d1629] p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-white">3D Printer 3</div>
                        <div className="text-[9px] text-amber-400">● Standby</div>
                        <div className="text-[9px] text-slate-400 mt-1">25°C / 24°C</div>
                      </div>
                      {/* Anel SVG Circular 45% */}
                      <div className="relative flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="18" stroke="#1e293b" strokeWidth="3" fill="transparent"/>
                          <circle cx="24" cy="24" r="18" stroke="#f59e0b" strokeWidth="3" strokeDasharray="113" strokeDashoffset="62" strokeLinecap="round" fill="transparent"/>
                        </svg>
                        <span className="absolute text-[10px] font-bold text-white">45%</span>
                      </div>
                    </div>

                    {/* Impressora 4 (Azul) */}
                    <div className="rounded-xl border border-slate-800 bg-[#0d1629] p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-white">3D Printer 4</div>
                        <div className="text-[9px] text-cyan-400">● Concluído</div>
                        <div className="text-[9px] text-slate-400 mt-1">0.32m / 100%</div>
                      </div>
                      {/* Anel SVG Circular 90% */}
                      <div className="relative flex items-center justify-center">
                        <svg className="w-12 h-12 transform -rotate-90">
                          <circle cx="24" cy="24" r="18" stroke="#1e293b" strokeWidth="3" fill="transparent"/>
                          <circle cx="24" cy="24" r="18" stroke="#38bdf8" strokeWidth="3" strokeDasharray="113" strokeDashoffset="11" strokeLinecap="round" fill="transparent"/>
                        </svg>
                        <span className="absolute text-[10px] font-bold text-white">90%</span>
                      </div>
                    </div>

                  </div>

                  {/* Widget de Telemetria e Gráfico de Onda */}
                  <div className="rounded-xl border border-slate-800 bg-[#0d1629] p-3">
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-bold text-white">Activity Timeline</span>
                      <span className="text-[#20c997] font-mono">180 Trabalhos • 0.32m</span>
                    </div>
                    {/* Gráfico de Linha SVG em Neon Verde */}
                    <svg className="w-full h-10" viewBox="0 0 300 40" fill="none">
                      <path d="M0 30 Q30 5 60 20 T120 15 T180 32 T240 10 T300 25" stroke="#20c997" strokeWidth="2.5" fill="none"/>
                      <path d="M0 30 Q30 5 60 20 T120 15 T180 32 T240 10 T300 25 V40 H0 Z" fill="url(#waveGlow)" opacity="0.3"/>
                      <defs>
                        <linearGradient id="waveGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#20c997"/>
                          <stop offset="100%" stopColor="transparent"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>

      </section>

      {/* ================= 4. INSTALADORES DESKTOP OFICIAIS ================= */}
      <section id="downloads" className="border-t border-[#151e30] bg-[#090e1a] py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#20c997]">
              Instaladores Oficiais
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
              Baixe o CTRL-Farm no seu Computador
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Programa desktop comercial autônomo com inicialização silenciosa (zero terminal), atalho na Área de Trabalho e arquitetura Local-First.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD 1: WINDOWS */}
            <div
              className={`relative rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                detectedOs === "windows"
                  ? "border-cyan-500 bg-gradient-to-b from-[#111f38] to-[#0c1626] shadow-2xl shadow-cyan-950/60 ring-2 ring-cyan-500/20 scale-[1.02]"
                  : "border-[#263246] bg-[#0d1527] hover:border-slate-700"
              }`}
            >
              {detectedOs === "windows" && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 shadow-lg">
                  ✨ Instalador Recomendado para seu PC
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                    </svg>
                  </div>
                  <span className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 font-mono text-xs font-bold text-cyan-300">
                    .exe (64-bit)
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold text-white">CTRL-Farm para Windows</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Instalador oficial autocontido de 1 clique para Windows 10 e 11. Cria o atalho oficial na Área de Trabalho com ícone, registra o desinstalador nativo e inicializa silenciosamente sem janelas de terminal.
                </p>

                <div className="mt-5 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Versão:</span>
                    <strong className="text-white font-mono">v1.0.0-Beta Oficial</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Compatibilidade:</span>
                    <span className="text-slate-200">Windows 10 / 11 (x64)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Modo de Operação:</span>
                    <span className="font-semibold text-cyan-300">Nativo Silencioso (Zero Terminal)</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-2.5">
                <a
                  href={WINDOWS_URL}
                  download="CTRL-Farm-Setup.exe"
                  className={`flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-sm font-bold shadow-xl transition active:scale-95 ${
                    detectedOs === "windows"
                      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 shadow-cyan-950/60 hover:brightness-110 ring-2 ring-cyan-400/30"
                      : "bg-[#162238] hover:bg-[#1c2c47] text-white border border-cyan-500/30"
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                  </svg>
                  <span>Baixar CTRL-Farm para Windows (.exe)</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyToClipboard(WINDOWS_URL, "win")}
                  className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 transition"
                >
                  {copiedLink === "win" ? "✓ Link copiado para a área de transferência!" : "Copiar link direto (.exe)"}
                </button>
              </div>
            </div>

            {/* CARD 2: MACOS */}
            <div
              className={`relative rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                detectedOs === "mac"
                  ? "border-[#20c997] bg-gradient-to-b from-[#10232b] to-[#0c1626] shadow-2xl shadow-emerald-950/60 ring-2 ring-emerald-500/20 scale-[1.02]"
                  : "border-[#263246] bg-[#0d1527] hover:border-slate-700"
              }`}
            >
              {detectedOs === "mac" && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#20c997] to-teal-500 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 shadow-lg">
                  ✨ Instalador Recomendado para seu Mac
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-white">
                    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 1.01-2.85-.9.04-1.98.6-2.62 1.34-.57.65-1.07 1.7-1.02 2.76.99.08 2.01-.5 2.63-1.25z"/>
                    </svg>
                  </div>
                  <span className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 font-mono text-xs font-bold text-[#20c997]">
                    .dmg (Universal)
                  </span>
                </div>

                <h3 className="mt-6 text-xl font-bold text-white">CTRL-Farm para macOS</h3>
                <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                  Imagem de Disco Apple (.dmg) com bundle `.app` nativo e atalho tradicional de arrastar para `/Applications`. Suporte universal otimizado para Apple Silicon (M1/M2/M3/M4) e Intel com inicialização silenciosa.
                </p>

                <div className="mt-5 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Versão:</span>
                    <strong className="text-white font-mono">v1.0.0-Beta Oficial</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Arquitetura:</span>
                    <span className="text-slate-200">Apple Silicon &amp; Intel (Universal)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Modo de Operação:</span>
                    <span className="font-semibold text-[#20c997]">Nativo Silencioso (Zero Terminal)</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-2.5">
                <a
                  href={MAC_URL}
                  download="CTRL-Farm.dmg"
                  className={`flex w-full items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-sm font-bold shadow-xl transition active:scale-95 ${
                    detectedOs === "mac"
                      ? "bg-gradient-to-r from-[#20c997] to-teal-500 text-slate-950 shadow-emerald-950/60 hover:brightness-110 ring-2 ring-emerald-400/30"
                      : "bg-[#142823] hover:bg-[#1a352e] text-white border border-emerald-500/30"
                  }`}
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 1.01-2.85-.9.04-1.98.6-2.62 1.34-.57.65-1.07 1.7-1.02 2.76.99.08 2.01-.5 2.63-1.25z"/>
                  </svg>
                  <span>Baixar CTRL-Farm para macOS (.dmg)</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyToClipboard(MAC_URL, "mac")}
                  className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 transition"
                >
                  {copiedLink === "mac" ? "✓ Link copiado para a área de transferência!" : "Copiar link direto (.dmg)"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= 5. RECURSOS & MONITORAMENTO ================= */}
      <section id="recursos" className="border-t border-[#151e30] bg-[#070b14] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#20c997]">
              Engenharia Desktop Industrial
            </span>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
              Arquitetura Híbrida: Local-First com Sincronização em Nuvem
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed">
              O CTRL-Farm combina a velocidade e independência de um software instalado nativamente no computador da sua farm com a segurança e praticidade da nuvem corporativa.
            </p>
          </div>

          <div id="monitoramento" className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* BLOCO 1: OPERAÇÃO LOCAL-FIRST */}
            <div className="rounded-3xl border border-[#263246] bg-[#0c1425] p-8 space-y-6 relative overflow-hidden group hover:border-[#20c997]/50 transition duration-300">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#20c997]/10 border border-[#20c997]/30 text-[#20c997] text-xl">
                  ⚡
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Operação 100% Local-First</h3>
                  <p className="text-xs text-slate-400">Latência zero e funcionamento ininterrupto</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Toda a gestão diária da sua fábrica de impressão funciona diretamente na máquina do cliente, garantindo que sua produção nunca pare mesmo se a internet oscilar ou cair:
              </p>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-[#20c997] font-bold">✔</span>
                  <span><strong>Gestão de Parque na Rede Local:</strong> Comunicação direta com Moonraker (Klipper), OctoPrint e interfaces LAN com resposta instantânea.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#20c997] font-bold">✔</span>
                  <span><strong>Streaming Local MediaMTX:</strong> Câmeras RTSP e WebRTC transmitidas dentro da sua rede local sem consumir plano de internet.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#20c997] font-bold">✔</span>
                  <span><strong>Calculadora &amp; Fatiamento:</strong> Cálculo de custos, perdas, impostos e margem executados localmente em cache de alta velocidade.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-[#20c997] font-bold">✔</span>
                  <span><strong>Zero Telas Pretas:</strong> Inicialização nativa com Splash Screen e controle na bandeja do sistema (System Tray).</span>
                </li>
              </ul>
            </div>

            {/* BLOCO 2: CONEXÃO EM NUVEM */}
            <div className="rounded-3xl border border-[#263246] bg-[#0c1425] p-8 space-y-6 relative overflow-hidden group hover:border-cyan-500/50 transition duration-300">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xl">
                  🛡️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Sincronização em Nuvem Segura</h3>
                  <p className="text-xs text-slate-400">Autenticação central, licenças e suporte</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Recursos estratégicos que conectam o aplicativo à API central do Sistema ADM para garantir conformidade, proteção e continuidade:
              </p>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-300">
                <li className="flex items-start gap-2.5">
                  <span className="text-cyan-400 font-bold">✔</span>
                  <span><strong>Autenticação Unificada:</strong> Login e controle de perfis sincronizados com o Firebase Cloud de alta disponibilidade.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-cyan-400 font-bold">✔</span>
                  <span><strong>Licenciamento Criptografado RSA:</strong> Validação de chave pública e assinatura digital diretamente com a autoridade de licenças.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-cyan-400 font-bold">✔</span>
                  <span><strong>Atualizações Silenciosas:</strong> Verificação contínua de novas versões sem interromper a execução dos trabalhos das impressoras.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="text-cyan-400 font-bold">✔</span>
                  <span><strong>Suporte Remoto Assistido:</strong> Chamados de suporte integrados com diagnóstico e telemetria para auxílio de engenharia.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-[#151e30] bg-[#050811] py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CTRL-Farm Industrial Platform. Arquitetura Desktop Nativa &amp; Local-First.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-300 transition">
              Acessar Painel Web
            </Link>
            <span>·</span>
            <Link href="/download" className="hover:text-slate-300 transition">
              Downloads
            </Link>
            <span>·</span>
            <a href="https://github.com/saulooliveirati/CTRL-Farm" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">
              Repositório GitHub
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
