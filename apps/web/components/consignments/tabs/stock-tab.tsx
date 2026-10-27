"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Package,
  Building2,
  ShoppingCart,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Truck,
} from "lucide-react";
import type { ConsignmentPartner, ConsignmentStockItem } from "@/lib/server-consignments";

type StockTabProps = {
  stocks: ConsignmentStockItem[];
  partners: ConsignmentPartner[];
  loading: boolean;
  onOpenShipmentModal: (partnerId?: string) => void;
  onOpenSaleModal: (partnerId?: string, productName?: string) => void;
  onOpenReturnModal: (partnerId?: string, productName?: string) => void;
};

export function StockTab({
  stocks,
  partners,
  loading,
  onOpenShipmentModal,
  onOpenSaleModal,
  onOpenReturnModal,
}: StockTabProps) {
  const [partnerFilter, setPartnerFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredStocks = useMemo(() => {
    return stocks.filter((st) => {
      const matchPartner = partnerFilter === "ALL" || st.locationId === partnerFilter;
      const matchSearch =
        searchTerm === "" ||
        st.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (st.sku && st.sku.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchPartner && matchSearch;
    });
  }, [stocks, partnerFilter, searchTerm]);

  // Totais consolidados da visualização atual
  const summary = useMemo(() => {
    let available = 0;
    let sold = 0;
    let returned = 0;
    let damaged = 0;
    let totalValue = 0;

    for (const st of filteredStocks) {
      available += st.quantityAvailable;
      sold += st.quantitySold;
      returned += st.quantityReturned;
      damaged += st.quantityDamaged;
      totalValue += st.quantityAvailable * Number(st.sellingPrice);
    }

    return { available, sold, returned, damaged, totalValue };
  }, [filteredStocks]);

  const totalPages = Math.ceil(filteredStocks.length / itemsPerPage) || 1;
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredStocks.slice(start, start + itemsPerPage);
  }, [filteredStocks, currentPage]);

  return (
    <div className="space-y-4">
      {/* Resumo Rápido dos Filtros Selecionados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Itens Disponíveis</span>
          <span className="text-xl font-bold text-white">{summary.available} un</span>
        </div>
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Total Vendido</span>
          <span className="text-xl font-bold text-emerald-400">{summary.sold} un</span>
        </div>
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Devoluções / Avarias</span>
          <span className="text-xl font-bold text-amber-300">
            {summary.returned} / {summary.damaged} un
          </span>
        </div>
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Valor em Estoque</span>
          <span className="text-xl font-bold text-cyan-300">
            R$ {summary.totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-[#101827]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por produto ou SKU no estoque..."
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
                {p.name} ({p.city})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onOpenShipmentModal(partnerFilter !== "ALL" ? partnerFilter : undefined)}
            className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <Truck className="h-4 w-4" />
            <span>Enviar Mais Produtos</span>
          </button>
        </div>
      </div>

      {/* Tabela de Estoque por Parceiro */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl">
        {loading && stocks.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Carregando estoques dos parceiros...
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Nenhum registro de estoque encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0c121e] text-slate-400 font-medium">
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4">Parceiro Comercial</th>
                  <th className="py-3.5 px-4 text-center">Disponível</th>
                  <th className="py-3.5 px-4 text-center">Vendido</th>
                  <th className="py-3.5 px-4 text-center">Devolvido</th>
                  <th className="py-3.5 px-4 text-center">Avariado</th>
                  <th className="py-3.5 px-4 text-right">Preço Venda</th>
                  <th className="py-3.5 px-4 text-right">Total em Estoque</th>
                  <th className="py-3.5 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedStocks.map((item) => {
                  const itemTotal = item.quantityAvailable * Number(item.sellingPrice);
                  const isLow = item.quantityAvailable > 0 && item.quantityAvailable <= 2;
                  const isOut = item.quantityAvailable === 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition group">
                      {/* Produto & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-xs flex items-center gap-2">
                          <Package className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                          <span>{item.productName}</span>
                        </div>
                        {item.sku && (
                          <span className="text-[10px] text-slate-400 font-mono ml-5">
                            SKU: {item.sku}
                          </span>
                        )}
                      </td>

                      {/* Parceiro */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-white">
                          <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{item.location.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {item.location.city} - {item.location.state}
                        </span>
                      </td>

                      {/* Quantidade Disponível */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-bold text-xs ${
                            isOut
                              ? "bg-slate-800 text-slate-500 border border-slate-700"
                              : isLow
                              ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {item.quantityAvailable} un
                        </span>
                      </td>

                      {/* Vendido */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-white font-semibold">{item.quantitySold}</span>
                      </td>

                      {/* Devolvido */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-slate-400">{item.quantityReturned}</span>
                      </td>

                      {/* Avariado */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={item.quantityDamaged > 0 ? "text-amber-400 font-bold" : "text-slate-500"}>
                          {item.quantityDamaged}
                        </span>
                      </td>

                      {/* Preço Unitário */}
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-200">
                        R$ {Number(item.sellingPrice).toFixed(2)}
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-bold text-cyan-300">
                        R$ {itemTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>

                      {/* Ações Rápidas */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={item.quantityAvailable <= 0}
                            onClick={() => onOpenSaleModal(item.locationId, item.productName)}
                            className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-30 transition"
                            title="Registrar venda deste produto"
                          >
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={item.quantityAvailable <= 0}
                            onClick={() => onOpenReturnModal(item.locationId, item.productName)}
                            className="p-1.5 rounded-lg border border-amber-500/30 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 disabled:opacity-30 transition"
                            title="Registrar devolução / avaria"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé Paginação */}
        {filteredStocks.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-[#0c121e] text-xs text-slate-400">
            <span>
              Mostrando {paginatedStocks.length} de {filteredStocks.length} itens em estoque
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
