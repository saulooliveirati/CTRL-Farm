import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistema ADM Gerente | CTRL-Farm",
  description: "Painel privado master de comercial, licenciamento, planos, assinaturas e atualizações do CTRL-Farm.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-[#070b14] text-slate-100 antialiased selection:bg-emerald-500 selection:text-slate-950"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
