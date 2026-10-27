"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ShoppingCart,
  Building2,
  Calendar,
  DollarSign,
  Plus,
  ArrowUpRight,
  Receipt,
} from "lucide-react";
import type { ConsignmentSale, ConsignmentPartner } from "@/lib/server-consignments";

type SalesTabProps = {
  sales: ConsignmentSale[];
  partners: ConsignmentPartner[];
  loading: boolean;
  onOpenCreateModal: () => void;
};

export function SalesTab({
  sales,
  partners,
  loading,
  onOpenCreateModal,
}: SalesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchPartner = partnerFilter === "ALL" || s.locationId === partnerFilter;
      const matchSearch =
        searchTerm === "" ||
        s.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchPartner && matchSearch;
    });
  }, [sales, partnerFilter, searchTerm]);

  // Resumo financeiro
  const summary = useMemo(() => {
    let totalGross = 0;
    let totalCommissions = 0;
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalUnits = 0;

    for (const s of filteredSales) {
      totalGross += Number(s.grossAmount);
      totalCommissions += Number(s.partnerCommission);
      totalRevenue += Number(s.farmRevenue);
      totalProfit += Number(s.netProfit);
      totalUnits += s.quantity;
    }

    return { totalGross, totalCommissions, totalRevenue, totalProfit, totalUnits };
  }, [filteredSales]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage) || 1;
  const paginatedSales = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSales.slice(start, start + itemsPerPage);
  }, [filteredSales, currentPage]);

  return (
    <div className="space-y-4">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Unidades Vendidas</span>
          <span className="text-xl font-bold text-white">{summary.totalUnits} un</span>
        </div>
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Total Bruto Vendido</span>
          <span className="text-xl font-bold text-slate-200">
            R$ {summary.totalGross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Comissões Retidas</span>
          <span className="text-xl font-bold text-amber-300">
            R$ {summary.totalCommissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-[#0e1c2e]">
          <span className="text-[11px] text-cyan-400 font-semibold block">Receita Líquida Farm</span>
          <span className="text-xl font-bold text-cyan-300">
            R$ {summary.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Barra de Busca & Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-[#101827]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar vendas por produto ou parceiro..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={partnerFilter}
            onChange={(e) => {
              setPartnerFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">Todos os Parceiros ({partners.length})</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Venda</span>
          </button>
        </div>
      </div>

      {/* Tabela de Vendas (DataTable) */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl">
        {loading && sales.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">Carregando histórico de vendas...</div>
        ) : filteredSales.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Nenhuma venda registrada com os filtros informados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0c121e] text-slate-400 font-medium">
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Parceiro</th>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4 text-center">Qtd</th>
                  <th className="py-3.5 px-4 text-right">Preço Unit.</th>
                  <th className="py-3.5 px-4 text-right">Valor Bruto</th>
                  <th className="py-3.5 px-4 text-right">Comissão</th>
                  <th className="py-3.5 px-4 text-right">Receita Farm</th>
                  <th className="py-3.5 px-4 text-right">Lucro Líquido</th>
                  <th className="py-3.5 px-4 text-center">Acerto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                    {/* Data */}
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(sale.soldAt).toLocaleDateString("pt-BR")}
                    </td>

                    {/* Parceiro */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{sale.location.name}</div>
                    </td>

                    {/* Produto */}
                    <td className="py-3 px-4 font-medium text-slate-200">{sale.productName}</td>

                    {/* Quantidade */}
                    <td className="py-3 px-4 text-center font-bold text-white">
                      {sale.quantity} un
                    </td>

                    {/* Preço Unitário */}
                    <td className="py-3 px-4 text-right text-slate-400">
                      R$ {Number(sale.unitPrice).toFixed(2)}
                    </td>

                    {/* Valor Bruto */}
                    <td className="py-3 px-4 text-right font-medium text-slate-200">
                      R$ {Number(sale.grossAmount).toFixed(2)}
                      {Number(sale.discount) > 0 && (
                        <div className="text-[10px] text-red-400">
                          -R$ {Number(sale.discount).toFixed(2)}
                        </div>
                      )}
                    </td>

                    {/* Comissão */}
                    <td className="py-3 px-4 text-right font-semibold text-amber-400">
                      R$ {Number(sale.partnerCommission).toFixed(2)}
                    </td>

                    {/* Receita Farm */}
                    <td className="py-3 px-4 text-right font-bold text-cyan-300">
                      R$ {Number(sale.farmRevenue).toFixed(2)}
                    </td>

                    {/* Lucro Líquido */}
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      R$ {Number(sale.netProfit).toFixed(2)}
                    </td>

                    {/* Status do Acerto */}
                    <td className="py-3 px-4 text-center">
                      {sale.settlementId ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Fechado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          Pendente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé Paginação */}
        {filteredSales.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-[#0c121e] text-xs text-slate-400">
            <span>
              Mostrando {paginatedSales.length} de {filteredSales.length} vendas
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
              >
                Anterior
              </button>
              <span className="font-semibold text-white">
                {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
