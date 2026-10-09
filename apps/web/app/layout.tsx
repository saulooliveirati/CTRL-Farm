import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CTRL+Farm",
  description: "Sistema de gerenciamento de impressão 3D",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Extensões como o LanguageTool podem adicionar atributos ao elemento raiz antes da hidratação.
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
