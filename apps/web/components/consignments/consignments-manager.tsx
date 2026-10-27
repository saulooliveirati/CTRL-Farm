"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Truck,
  ShoppingCart,
  RotateCcw,
  Receipt,
  FileText,
  Settings,
  Plus,
} from "lucide-react";
import type {
  ConsignmentPartner,
  ConsignmentStockItem,
  ConsignmentShipment,
  ConsignmentSale,
  ConsignmentMovement,
  ConsignmentSettlement,
  ConsignmentDashboardMetrics,
} from "@/lib/server-consignments";
import type { ProductRecord } from "@/lib/server-products";

import { DashboardTab } from "./tabs/dashboard-tab";
import { PartnersTab } from "./tabs/partners-tab";
import { StockTab } from "./tabs/stock-tab";
import { ShipmentsTab } from "./tabs/shipments-tab";
import { SalesTab } from "./tabs/sales-tab";
import { ReturnsTab } from "./tabs/returns-tab";
import { SettlementsTab } from "./tabs/settlements-tab";
import { ReportsTab } from "./tabs/reports-tab";
import { SettingsTab } from "./tabs/settings-tab";

import { PartnerModal } from "./modals/partner-modal";
import { ShipmentModal } from "./modals/shipment-modal";
import { SaleModal } from "./modals/sale-modal";
import { ReturnModal } from "./modals/return-modal";
import { SettlementModal } from "./modals/settlement-modal";
import { PaymentModal } from "./modals/payment-modal";

type TabKey =
  | "dashboard"
  | "partners"
  | "stock"
  | "shipments"
  | "sales"
  | "returns"
  | "settlements"
  | "reports"
  | "settings";

const TAB_CONFIG: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "partners", label: "Parceiros", icon: Users },
  { key: "stock", label: "Estoque Consignado", icon: Package },
  { key: "shipments", label: "Envio de Produtos", icon: Truck },
  { key: "sales", label: "Vendas", icon: ShoppingCart },
  { key: "returns", label: "Devoluções", icon: RotateCcw },
  { key: "settlements", label: "Acertos Financeiros", icon: Receipt },
  { key: "reports", label: "Relatórios", icon: FileText },
  { key: "settings", label: "Configurações", icon: Settings },
];

export function ConsignmentsManager({
  defaultTab = "dashboard",
  productsCatalog = [],
  currentUserRole = "ADMIN",
}: {
  defaultTab?: string;
  productsCatalog?: ProductRecord[];
  currentUserRole?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const fromUrl = searchParams.get("tab") as TabKey | null;
    return fromUrl || (defaultTab as TabKey) || "dashboard";
  });

  // Sincroniza com parâmetros de URL (incluindo cliques no menu lateral)
  useEffect(() => {
    const tabParam = searchParams.get("tab") as TabKey | null;
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    startTransition(() => {
      router.push(`/consignments?tab=${key}`, { scroll: false });
    });
  };

  // Estados dos Dados
  const [metrics, setMetrics] = useState<ConsignmentDashboardMetrics | null>(null);
  const [partners, setPartners] = useState<ConsignmentPartner[]>([]);
  const [stocks, setStocks] = useState<ConsignmentStockItem[]>([]);
  const [shipments, setShipments] = useState<ConsignmentShipment[]>([]);
  const [sales, setSales] = useState<ConsignmentSale[]>([]);
  const [movements, setMovements] = useState<ConsignmentMovement[]>([]);
  const [settlements, setSettlements] = useState<ConsignmentSettlement[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Modais
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerToEdit, setPartnerToEdit] = useState<ConsignmentPartner | null>(null);

  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [shipmentPartnerId, setShipmentPartnerId] = useState<string | undefined>();

  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [salePartnerId, setSalePartnerId] = useState<string | undefined>();
  const [saleProductName, setSaleProductName] = useState<string | undefined>();

  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnPartnerId, setReturnPartnerId] = useState<string | undefined>();
  const [returnProductName, setReturnProductName] = useState<string | undefined>();

  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [settlementPartnerId, setSettlementPartnerId] = useState<string | undefined>();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [settlementToPay, setSettlementToPay] = useState<ConsignmentSettlement | null>(null);

  // Carregamento centralizado de dados
  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        dashRes,
        partRes,
        stockRes,
        shipRes,
        saleRes,
        movRes,
        settleRes,
      ] = await Promise.all([
        fetch("/api/consignments/dashboard").then((r) => r.json()).catch(() => null),
        fetch("/api/consignments/locations").then((r) => r.json()).catch(() => null),
        fetch("/api/consignments/stocks").then((r) => r.json()).catch(() => null),
        fetch("/api/consignments/shipments").then((r) => r.json()).catch(() => null),
        fetch("/api/consignments/sales").then((r) => r.json()).catch(() => null),
        fetch("/api/consignments/movements").then((r) => r.json()).catch(() => null),
        fetch("/api/consignments/settlements").then((r) => r.json()).catch(() => null),
      ]);

      if (dashRes) setMetrics(dashRes.data ?? dashRes);
      if (partRes) setPartners(partRes.data ?? partRes ?? []);
      if (stockRes) setStocks(stockRes.data ?? stockRes ?? []);
      if (shipRes) setShipments(shipRes.data ?? shipRes ?? []);
      if (saleRes) setSales(saleRes.data ?? saleRes ?? []);
      if (movRes) setMovements(movRes.data ?? movRes ?? []);
      if (settleRes) setSettlements(settleRes.data ?? settleRes ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Ações de abertura de modais com contexto
  const handleOpenEditPartner = (p: ConsignmentPartner) => {
    setPartnerToEdit(p);
    setPartnerModalOpen(true);
  };

  const handleOpenCreatePartner = () => {
    setPartnerToEdit(null);
    setPartnerModalOpen(true);
  };

  const handleOpenShipment = (partnerId?: string) => {
    setShipmentPartnerId(partnerId);
    setShipmentModalOpen(true);
  };

  const handleOpenSale = (partnerId?: string, productName?: string) => {
    setSalePartnerId(partnerId);
    setSaleProductName(productName);
    setSaleModalOpen(true);
  };

  const handleOpenReturn = (partnerId?: string, productName?: string) => {
    setReturnPartnerId(partnerId);
    setReturnProductName(productName);
    setReturnModalOpen(true);
  };

  const handleOpenSettlement = (partnerId?: string) => {
    setSettlementPartnerId(partnerId);
    setSettlementModalOpen(true);
  };

  const handleOpenPayment = (st: ConsignmentSettlement) => {
    setSettlementToPay(st);
    setPaymentModalOpen(true);
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!confirm("Deseja realmente remover este parceiro comercial?")) return;
    try {
      const res = await fetch(`/api/consignments/locations/${partnerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadAllData();
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Gestão de Consignados
            </h1>
            <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[11px] font-bold text-cyan-400 border border-cyan-500/30">
              Módulo Ativo
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Controle de produtos em consignação, estoques descentralizados por parceiro, vendas e acertos financeiros
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAllData}
            disabled={loading}
            className="rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition flex items-center gap-1.5"
            title="Atualizar dados do módulo"
          >
            <span className={loading ? "animate-spin" : ""}>↻</span>
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreatePartner}
            className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3.5 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Parceiro</span>
          </button>
        </div>
      </div>

      {/* Navegação por Submenus do Módulo */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin border-b border-slate-800/80 text-xs">
        {TAB_CONFIG.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;

          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition shrink-0 ${
                isActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-md shadow-cyan-950/40"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-cyan-300" : "text-slate-500"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo Dinâmico da Aba Selecionada */}
      <div>
        {activeTab === "dashboard" && (
          <DashboardTab
            metrics={metrics}
            loading={loading}
            onOpenPartnerModal={handleOpenCreatePartner}
            onOpenShipmentModal={() => handleOpenShipment()}
            onOpenSaleModal={() => handleOpenSale()}
            onOpenSettlementModal={() => handleOpenSettlement()}
            onSelectTab={(k: string) => handleTabChange(k as TabKey)}
          />
        )}

        {activeTab === "partners" && (
          <PartnersTab
            partners={partners}
            loading={loading}
            onOpenCreateModal={handleOpenCreatePartner}
            onOpenEditModal={handleOpenEditPartner}
            onOpenShipmentForPartner={(id) => handleOpenShipment(id)}
            onDeletePartner={handleDeletePartner}
          />
        )}

        {activeTab === "stock" && (
          <StockTab
            stocks={stocks}
            partners={partners}
            loading={loading}
            onOpenShipmentModal={(id) => handleOpenShipment(id)}
            onOpenSaleModal={(id, prod) => handleOpenSale(id, prod)}
            onOpenReturnModal={(id, prod) => handleOpenReturn(id, prod)}
          />
        )}

        {activeTab === "shipments" && (
          <ShipmentsTab
            shipments={shipments}
            partners={partners}
            loading={loading}
            onOpenCreateModal={() => handleOpenShipment()}
          />
        )}

        {activeTab === "sales" && (
          <SalesTab
            sales={sales}
            partners={partners}
            loading={loading}
            onOpenCreateModal={() => handleOpenSale()}
          />
        )}

        {activeTab === "returns" && (
          <ReturnsTab
            movements={movements}
            partners={partners}
            loading={loading}
            onOpenCreateModal={() => handleOpenReturn()}
          />
        )}

        {activeTab === "settlements" && (
          <SettlementsTab
            settlements={settlements}
            partners={partners}
            loading={loading}
            onOpenCreateModal={() => handleOpenSettlement()}
            onOpenPaymentModal={handleOpenPayment}
          />
        )}

        {activeTab === "reports" && <ReportsTab partners={partners} />}

        {activeTab === "settings" && <SettingsTab />}
      </div>

      {/* Modais Globais do Módulo */}
      <PartnerModal
        isOpen={partnerModalOpen}
        onClose={() => setPartnerModalOpen(false)}
        onSuccess={loadAllData}
        partnerToEdit={partnerToEdit}
      />

      <ShipmentModal
        isOpen={shipmentModalOpen}
        onClose={() => setShipmentModalOpen(false)}
        onSuccess={loadAllData}
        partners={partners}
        productsCatalog={productsCatalog}
      />

      <SaleModal
        isOpen={saleModalOpen}
        onClose={() => setSaleModalOpen(false)}
        onSuccess={loadAllData}
        partners={partners}
        initialPartnerId={salePartnerId}
        initialProductName={saleProductName}
      />

      <ReturnModal
        isOpen={returnModalOpen}
        onClose={() => setReturnModalOpen(false)}
        onSuccess={loadAllData}
        partners={partners}
        initialPartnerId={returnPartnerId}
        initialProductName={returnProductName}
      />

      <SettlementModal
        isOpen={settlementModalOpen}
        onClose={() => setSettlementModalOpen(false)}
        onSuccess={loadAllData}
        partners={partners}
        initialPartnerId={settlementPartnerId}
      />

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSettlementToPay(null);
        }}
        onSuccess={loadAllData}
        settlement={settlementToPay}
      />
    </div>
  );
}
