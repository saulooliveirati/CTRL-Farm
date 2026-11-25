import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/contexts/language-context";

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
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
