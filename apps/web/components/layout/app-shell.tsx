"use client";

import { useState, type ReactNode } from "react";
import type { PublicUser } from "@/lib/auth-types";
import { LicensingProvider, useLicensing } from "@/contexts/licensing-context";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { PlanFeatureGate } from "./plan-feature-gate";
import { GlobalActivationModal } from "./global-activation-modal";
import { SuspendedSubscriptionModal } from "./suspended-subscription-modal";
import { FloatingAiAssistant } from "@/components/ai-farm/floating-ai-assistant";

interface AppShellProps {
  children: ReactNode;
  user: PublicUser;
  initialLicensing?: any;
}

function InnerAppShell({ children, user }: { children: ReactNode; user: PublicUser }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { hasFeature, isLicensed } = useLicensing();

  // O assistente de IA só é exibido se o plano contratado contemplar IA (Business, Enterprise, Unlimited)
  const canShowAiAssistant = isLicensed && hasFeature("aiFarm");

  return (
    <div className="flex min-h-screen bg-[#0a0f1b] text-slate-100">
      <Sidebar
        user={user}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={() => {
            if (window.matchMedia("(min-width: 1024px)").matches)
              setCollapsed((current) => !current);
            else setMobileOpen((current) => !current);
          }}
        />

        <main className="w-full flex-1 overflow-x-hidden p-3 sm:p-5 xl:p-7">
          <PlanFeatureGate>{children}</PlanFeatureGate>
        </main>
      </div>

      {/* Assistente de IA Flutuante exibido apenas se permitido pelo plano */}
      {canShowAiAssistant && <FloatingAiAssistant user={user} />}

      {/* Modal Global de Ativação de Chave */}
      <GlobalActivationModal />

      {/* Pop-up de Bloqueio por Assinatura Suspensa */}
      <SuspendedSubscriptionModal />
    </div>
  );
}

export function AppShell({ children, user, initialLicensing }: AppShellProps) {
  return (
    <LicensingProvider initialData={initialLicensing}>
      <InnerAppShell user={user}>{children}</InnerAppShell>
    </LicensingProvider>
  );
}
