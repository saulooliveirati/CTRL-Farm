"use client";

import {
  Users,
  Package,
  DollarSign,
  TrendingUp,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Award,
  ArrowUpRight,
  Truck,
  ShoppingCart,
  Plus,
} from "lucide-react";
import type { ConsignmentDashboardMetrics, ConsignmentPartner } from "@/lib/server-consignments";

type DashboardTabProps = {
  metrics: ConsignmentDashboardMetrics | null;
  loading: boolean;
  onOpenPartnerModal: () => void;
  onOpenShipmentModal: () => void;
  onOpenSaleModal: () => void;
  onOpenSettlementModal: () => void;
  onSelectTab: (tabKey: string) => void;
};

export function DashboardTab({
  metrics,
  loading,
  onOpenPartnerModal,
  onOpenShipmentModal,
  onOpenSaleModal,
  onOpenSettlementModal,
  onSelectTab,
}: DashboardTabProps) {
  if (loading && !metrics) {
    return (
      <div className="grid place-items-center py-20 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-xs">Carregando indicadores de consignados...</p>
        </div>
      </div>
    );
  }

  const rawOverview = (metrics as any)?.overview || metrics || {};
  const m = {
    totalPartners: Number(rawOverview.totalPartners ?? 0),
    activePartners: Number(rawOverview.activePartners ?? 0),
    productsInConsignment: Number(rawOverview.productsInConsignment ?? 0),
    totalCostInConsignment: Number(rawOverview.totalCostInConsignment ?? 0),
    totalValueInConsignment: Number(rawOverview.totalValueInConsignment ?? 0),
    productsSold: Number(rawOverview.productsSold ?? 0),
    productsReturned: Number(rawOverview.productsReturned ?? 0),
    productsDamaged: Number(rawOverview.productsDamaged ?? 0),
    totalGrossSales: Number(rawOverview.totalGrossSales ?? 0),
    totalCommissions: Number(rawOverview.totalCommissions ?? 0),
    totalFarmRevenue: Number(rawOverview.totalFarmRevenue ?? 0),
    totalNetProfit: Number(rawOverview.totalNetProfit ?? 0),
    totalToReceive: Number(rawOverview.totalToReceive ?? 0),
    totalReceived: Number(rawOverview.totalReceived ?? 0),
    overdueSettlementsCount: Number(rawOverview.overdueSettlementsCount ?? 0),
    topPartners: metrics?.topPartners || [],
    topProducts: metrics?.topProducts || [],
    alerts: metrics?.alerts || [],
  };

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-[#101827]">
        <div>
          <h2 className="text-sm font-bold text-white">Ações Rápidas de Consignação</h2>
          <p className="text-xs text-slate-400">Operações frequentes no módulo</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenShipmentModal}
            className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1.5 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Novo Envio</span>
          </button>
          <button
            type="button"
            onClick={onOpenSaleModal}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span>Nova Venda</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettlementModal}
            className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
          >
            <DollarSign className="h-3.5 w-3.5 text-amber-400" />
            <span>Novo Acerto</span>
          </button>
          <button
            type="button"
            onClick={onOpenPartnerModal}
            className="rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 text-cyan-400" />
            <span>Novo Parceiro</span>
          </button>
        </div>
      </div>

      {/* Grid de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Total Parceiros */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#101827] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total de Parceiros</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white">{m.totalPartners}</div>
            <p className="text-[11px] text-emerald-400 mt-0.5">
              {m.activePartners} ativos gerando vendas
            </p>
          </div>
        </div>

        {/* Produtos em Consignação */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#101827] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Produtos em Consignação</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/10 text-purple-400">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-white">{m.productsInConsignment} un</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Distribuídos nos pontos parceiros
            </p>
          </div>
        </div>

        {/* Valor Total em Consignação */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#101827] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Valor em Consignação</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-cyan-300">
              R$ {m.totalValueInConsignment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Custo estoque: R$ {m.totalCostInConsignment.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Produtos Vendidos */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#101827] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Produtos Vendidos</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-400">{m.productsSold} un</div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Total bruto: R$ {m.totalGrossSales.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* Produtos Devolvidos & Avarias */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#101827] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Devoluções / Avarias</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
              <RotateCcw className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-300">
              {m.productsReturned} / {m.productsDamaged} un
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Devoluções regulares vs peças danificadas
            </p>
          </div>
        </div>

        {/* Valor a Receber */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#101827] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Valor a Receber</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-amber-400">
              R$ {m.totalToReceive.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {m.overdueSettlementsCount > 0 ? (
                <span className="text-red-400 font-semibold">
                  ⚠️ {m.overdueSettlementsCount} acerto(s) vencido(s)
                </span>
              ) : (
                "Acertos em dia"
              )}
            </p>
          </div>
        </div>

        {/* Valor Recebido */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#101827] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Valor Recebido</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-emerald-400">
              R$ {m.totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Liquidado em caixa / banco
            </p>
          </div>
        </div>

        {/* Comissões Pagas/Retidas */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-[#101827] shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Comissões dos Parceiros</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-orange-500/10 text-orange-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-orange-300">
              R$ {m.totalCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Retido pelos pontos de venda
            </p>
          </div>
        </div>

        {/* Lucro Líquido da Farm */}
        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#101827] to-[#0c1f36] shadow-xl flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-cyan-400">
            <span className="text-xs font-bold uppercase tracking-wider">Lucro Líquido Real</span>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/20 text-cyan-300">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-3xl font-extrabold text-cyan-300">
              R$ {m.totalNetProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Receita líquida subtraindo custo de filamento e fabricação
            </p>
          </div>
        </div>
      </div>

      {/* Alertas Inteligentes */}
      {m.alerts.length > 0 && (
        <div className="p-5 rounded-2xl border border-amber-500/30 bg-[#141b2a] shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Alertas e Atenção Requerida ({m.alerts.length})</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {m.alerts.map((al, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between ${
                  al.severity === "CRITICAL"
                    ? "border-red-500/40 bg-red-950/20 text-red-300"
                    : "border-amber-500/30 bg-amber-950/20 text-amber-200"
                }`}
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5 mb-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <span>{al.title}</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{al.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rankings: Top Parceiros & Top Produtos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Parceiros */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#101827] shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="h-4 w-4 text-cyan-400" />
              <span>Top Parceiros em Faturamento</span>
            </h3>
            <button
              type="button"
              onClick={() => onSelectTab("partners")}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
            >
              <span>Ver todos</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {m.topPartners.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Nenhuma venda registrada ainda para o ranking de parceiros.
            </p>
          ) : (
            <div className="space-y-3">
              {m.topPartners.map((partner, index) => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                        index === 0
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : index === 1
                          ? "bg-slate-300/20 text-slate-200 border border-slate-300/30"
                          : "bg-cyan-500/10 text-cyan-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white text-xs">{partner.name}</div>
                      <div className="text-[11px] text-slate-400">{partner.itemsSold} un vendidas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-400 text-xs">
                      R$ {partner.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Produtos */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#101827] shadow-xl">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-400" />
              <span>Top Produtos Mais Vendidos</span>
            </h3>
            <button
              type="button"
              onClick={() => onSelectTab("stock")}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
            >
              <span>Ver estoque</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {m.topProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              Nenhuma venda registrada ainda para o ranking de produtos.
            </p>
          ) : (
            <div className="space-y-3">
              {m.topProducts.map((product, index) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/60"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                        index === 0
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : index === 1
                          ? "bg-slate-300/20 text-slate-200 border border-slate-300/30"
                          : "bg-purple-500/10 text-purple-300"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white text-xs">{product.name}</div>
                      <div className="text-[11px] text-slate-400">{product.quantity} unidades vendidas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-cyan-300 text-xs">
                      R$ {product.revenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
