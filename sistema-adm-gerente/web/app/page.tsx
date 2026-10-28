"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "@/components/header";
import { DashboardView } from "@/components/dashboard-view";
import { ClientsView } from "@/components/clients-view";
import { PlansView } from "@/components/plans-view";
import { SubscriptionsView } from "@/components/subscriptions-view";
import { LicensesView } from "@/components/licenses-view";
import { UpdatesView } from "@/components/updates-view";
import { SettingsView } from "@/components/settings-view";
import { AuditView } from "@/components/audit-view";

export default function AdminHomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [adminUser, setAdminUser] = useState<{
    name: string;
    username: string;
    role: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Shared state across views
  const [metrics, setMetrics] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [metricsRes, clientsRes, plansRes, subsRes, licsRes] = await Promise.allSettled([
        fetch("/api/proxy/dashboard"),
        fetch("/api/proxy/clients"),
        fetch("/api/proxy/plans"),
        fetch("/api/proxy/subscriptions"),
        fetch("/api/proxy/licenses"),
      ]);

      if (metricsRes.status === "fulfilled" && metricsRes.value.ok) {
        setMetrics(await metricsRes.value.json());
      }
      if (clientsRes.status === "fulfilled" && clientsRes.value.ok) {
        const data = await clientsRes.value.json();
        setClients(Array.isArray(data) ? data : data.items || []);
      }
      if (plansRes.status === "fulfilled" && plansRes.value.ok) {
        const data = await plansRes.value.json();
        setPlans(Array.isArray(data) ? data : data.items || []);
      }
      if (subsRes.status === "fulfilled" && subsRes.value.ok) {
        const data = await subsRes.value.json();
        setSubscriptions(Array.isArray(data) ? data : data.items || []);
      }
      if (licsRes.status === "fulfilled" && licsRes.value.ok) {
        const data = await licsRes.value.json();
        setLicenses(Array.isArray(data) ? data : data.items || []);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do Sistema ADM Gerente:", err);
    }
  }, []);

  useEffect(() => {
    async function checkAuthAndInit() {
      try {
        const res = await fetch("/api/proxy/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        setAdminUser(data);
        await loadData();
      } catch (err) {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuthAndInit();
  }, [router, loadData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#070b14] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-medium">Carregando Sistema ADM Gerente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-200">
      <AdminHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        adminUser={adminUser}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {activeTab === "dashboard" && (
          <DashboardView
            metrics={metrics}
            onNavigate={(tab: string) => setActiveTab(tab)}
            onOpenGenerateModal={() => {
              setActiveTab("licenses");
              setIsGenerateModalOpen(true);
            }}
          />
        )}

        {activeTab === "clients" && (
          <ClientsView clients={clients} plans={plans} onRefresh={loadData} />
        )}

        {activeTab === "plans" && <PlansView plans={plans} />}

        {activeTab === "subscriptions" && (
          <SubscriptionsView
            subscriptions={subscriptions}
            clients={clients}
            plans={plans}
            onRefresh={loadData}
          />
        )}

        {activeTab === "licenses" && (
          <LicensesView
            licenses={licenses}
            clients={clients}
            plans={plans}
            subscriptions={subscriptions}
            isGenerateModalOpen={isGenerateModalOpen}
            setIsGenerateModalOpen={setIsGenerateModalOpen}
            onRefresh={loadData}
          />
        )}

        {activeTab === "updates" && <UpdatesView />}

        {activeTab === "settings" && <SettingsView />}

        {activeTab === "audit" && <AuditView />}
      </main>
    </div>
  );
}
