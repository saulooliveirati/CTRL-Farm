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
    <div className="min-h-screen bg-[#0a0f1b] text-slate-100 selection:bg-[#20c997] selection:text-slate-950 font-sans">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-[#263246] bg-[#0a0f1b]/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#20c997] to-teal-700 p-0.5 shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#0a0f1b]">
                <span className="text-xl">🖨️</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight text-white">
                  CTRL<span className="text-[#20c997]">+Farm</span>
                </span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#20c997]">
                  v1.0.0-Beta
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Plataforma Industrial de Impressão 3D</p>
            </div>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-6">
            <a href="#downloads" className="text-xs font-semibold text-slate-300 hover:text-[#20c997] transition hidden sm:inline-block">
              Instaladores
            </a>
            <a href="#instrucoes" className="text-xs font-semibold text-slate-300 hover:text-[#20c997] transition hidden sm:inline-block">
              Como Instalar
            </a>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#20c997] to-teal-600 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-emerald-950/40 hover:brightness-110 transition active:scale-95"
            >
              <span>Acessar Painel Web</span>
              <span>→</span>
            </Link>
          </nav>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        {/* Glow de fundo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-gradient-to-b from-[#20c997]/15 via-transparent to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#263246] bg-[#101827] px-4 py-1.5 text-xs font-semibold text-slate-300 mb-6 shadow-inner">
            <span className="flex h-2 w-2 rounded-full bg-[#20c997] animate-ping" />
            <span className="text-[#20c997]">Novo Beta Oficial</span>
            <span>·</span>
            <span>Disponível para Windows (.exe) e macOS (.dmg)</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight sm:leading-none">
            A Solução Completa para{" "}
            <span className="bg-gradient-to-r from-emerald-400 via-[#20c997] to-cyan-400 bg-clip-text text-transparent">
              Fazendas de Impressão 3D
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-sm sm:text-base text-slate-400 leading-relaxed">
            Controle total da sua operação 3D: telemetria em tempo real, monitoramento por câmera, gestão de estoque de filamentos, cálculo inteligente de custos e orçamentos, inteligência artificial integrada e suporte remoto assistido.
          </p>

          {/* BADGE DE DETECÇÃO DE OS */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-[#0e1626] px-4 py-2 text-xs text-slate-300">
            <span>💻 Seu sistema operacional detectado:</span>
            {detectedOs === "windows" && (
              <span className="font-bold text-cyan-400 flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                </svg>
                Microsoft Windows (64-bit)
              </span>
            )}
            {detectedOs === "mac" && (
              <span className="font-bold text-white flex items-center gap-1">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 1.01-2.85-.9.04-1.98.6-2.62 1.34-.57.65-1.07 1.7-1.02 2.76.99.08 2.01-.5 2.63-1.25z"/>
                </svg>
                Apple macOS (Apple Silicon / Intel)
              </span>
            )}
            {detectedOs === "other" && (
              <span className="font-bold text-[#20c997]">Selecione abaixo seu instalador oficial</span>
            )}
          </div>
        </div>

        {/* ================= CARDS DE DOWNLOAD DOS 2 INSTALADORES ================= */}
        <div id="downloads" className="mx-auto mt-12 max-w-5xl px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* CARD 1: WINDOWS */}
            <div
              className={`relative rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                detectedOs === "windows"
                  ? "border-cyan-500 bg-gradient-to-b from-[#111f38] to-[#0c1626] shadow-2xl shadow-cyan-950/50 scale-[1.02]"
                  : "border-[#263246] bg-[#101827] hover:border-slate-700"
              }`}
            >
              {detectedOs === "windows" && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 shadow-lg">
                  ✨ Recomendado para seu PC
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
                  Instalador oficial nativo de 1 clique para Windows 10 e 11. Binários compactos de baixíssimo consumo de memória RAM, sem necessidade de Docker.
                </p>

                <div className="mt-5 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Versão:</span>
                    <strong className="text-white font-mono">v1.0.0-Beta</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Compatibilidade:</span>
                    <span className="text-slate-200">Windows 10 / 11 (x64)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Formato:</span>
                    <span className="font-mono text-cyan-300">CTRL-Farm-Setup.exe</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-2.5">
                <a
                  href={WINDOWS_URL}
                  download="CTRL-Farm-Setup.exe"
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-cyan-950/50 hover:brightness-110 transition active:scale-95"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801"/>
                  </svg>
                  <span>Baixar para Windows</span>
                  <span className="text-xs opacity-75">(.exe)</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyToClipboard(WINDOWS_URL, "win")}
                  className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 transition"
                >
                  {copiedLink === "win" ? "✓ Link copiado para a área de transferência!" : "Copiar link de download"}
                </button>
              </div>
            </div>

            {/* CARD 2: MACOS */}
            <div
              className={`relative rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                detectedOs === "mac"
                  ? "border-[#20c997] bg-gradient-to-b from-[#10232b] to-[#0c1626] shadow-2xl shadow-emerald-950/50 scale-[1.02]"
                  : "border-[#263246] bg-[#101827] hover:border-slate-700"
              }`}
            >
              {detectedOs === "mac" && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#20c997] to-teal-500 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-950 shadow-lg">
                  ✨ Recomendado para seu Mac
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
                  Pacote oficial em Imagem de Disco Apple (.dmg). Suporte universal nativo para Apple Silicon (M1, M2, M3, M4) e processadores Intel.
                </p>

                <div className="mt-5 space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Versão:</span>
                    <strong className="text-white font-mono">v1.0.0-Beta</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Arquitetura:</span>
                    <span className="text-slate-200">Apple Silicon &amp; Intel</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Formato:</span>
                    <span className="font-mono text-[#20c997]">CTRL-Farm.dmg</span>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-2.5">
                <a
                  href={MAC_URL}
                  download="CTRL-Farm.dmg"
                  className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#20c997] to-teal-600 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-emerald-950/50 hover:brightness-110 transition active:scale-95"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 1.01-2.85-.9.04-1.98.6-2.62 1.34-.57.65-1.07 1.7-1.02 2.76.99.08 2.01-.5 2.63-1.25z"/>
                  </svg>
                  <span>Baixar para macOS</span>
                  <span className="text-xs opacity-75">(.dmg)</span>
                </a>

                <button
                  type="button"
                  onClick={() => copyToClipboard(MAC_URL, "mac")}
                  className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 transition"
                >
                  {copiedLink === "mac" ? "✓ Link copiado para a área de transferência!" : "Copiar link de download"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= INSTRUÇÕES DE INSTALAÇÃO PASSO A PASSO ================= */}
      <section id="instrucoes" className="border-t border-[#263246] bg-[#0c1425] py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Como Instalar em Menos de 1 Minuto
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-400">
              Processo de instalação limpo, seguro e descomplicado para ambos os sistemas operacionais.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* GUIA WINDOWS */}
            <div className="rounded-2xl border border-slate-800 bg-[#090f1d] p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-xs">
                  1
                </span>
                <span>Instalação no Windows (.exe)</span>
              </div>
              <ol className="list-decimal pl-5 space-y-3 text-xs text-slate-300">
                <li>
                  Baixe o arquivo <code className="text-cyan-300 font-mono">CTRL-Farm-Setup.exe</code> pelo botão acima.
                </li>
                <li>
                  Dê um duplo clique no arquivo baixado na sua pasta de Downloads.
                </li>
                <li>
                  O assistente autocontido cria os atalhos na Área de Trabalho e no Menu Iniciar.
                </li>
                <li>
                  O aplicativo inicia automaticamente e abre a interface da fazenda na tela!
                </li>
              </ol>
            </div>

            {/* GUIA MACOS */}
            <div className="rounded-2xl border border-slate-800 bg-[#090f1d] p-6 space-y-4">
              <div className="flex items-center gap-2.5 text-[#20c997] font-bold text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
                  2
                </span>
                <span>Instalação no macOS (.dmg)</span>
              </div>
              <ol className="list-decimal pl-5 space-y-3 text-xs text-slate-300">
                <li>
                  Baixe o arquivo <code className="text-[#20c997] font-mono">CTRL-Farm.dmg</code> pelo botão acima.
                </li>
                <li>
                  Dê um duplo clique na imagem de disco para montá-la no Finder.
                </li>
                <li>
                  Arraste o ícone do <strong>CTRL-Farm</strong> para a pasta <strong>Applications</strong> (Aplicativos).
                </li>
                <li>
                  Abra pelo Launchpad ou Spotlight. O supervisor nativo cuida de todo o resto!
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#263246] bg-[#070b14] py-8 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 CTRL-Farm Industrial Platform. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-slate-300 transition">
              Acessar Painel Web
            </Link>
            <span>·</span>
            <a href="https://github.com/saulooliveirati/CTRL-Farm" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition">
              GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
