// ==============================================================================
// Layout PWA iOS — CTRL Farm Manager Mobile
// Configuração de Viewport Cover, Safe Areas, Status Bar e Service Worker
// ==============================================================================

import type { Metadata, Viewport } from 'next';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'CTRL Farm Manager Mobile',
  description: 'Painel executivo móvel exclusivo para administradores e gerentes de fazendas 3D',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CTRL Manager',
  },
  icons: {
    icon: '/mobile/icon-192.svg',
    apple: '/mobile/icon-512.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#000000',
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 dark:bg-black font-sans antialiased text-slate-900 dark:text-slate-100 selection:bg-brand-neon selection:text-slate-950">
      {/* Script de Registro do Service Worker para Performance < 2s e PWA */}
      <Script id="register-sw" strategy="afterInteractive">
        {`
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(
                function(registration) {
                  console.log('[PWA] Service Worker registrado com escopo:', registration.scope);
                },
                function(err) {
                  console.warn('[PWA] Falha no registro do Service Worker:', err);
                }
              );
            });
          }
        `}
      </Script>
      {children}
    </div>
  );
}
