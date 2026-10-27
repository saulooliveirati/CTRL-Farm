"use client";

import { useState, useMemo } from "react";
import { Search, RotateCcw, Building2, Calendar, AlertTriangle, Plus, Package } from "lucide-react";
import type { ConsignmentMovement, ConsignmentPartner } from "@/lib/server-consignments";

type ReturnsTabProps = {
  movements: ConsignmentMovement[];
  partners: ConsignmentPartner[];
  loading: boolean;
  onOpenCreateModal: () => void;
};

export function ReturnsTab({
  movements,
  partners,
  loading,
  onOpenCreateModal,
}: ReturnsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filtra apenas movimentações relacionadas a devoluções, avarias ou perdas
  const returnMovements = useMemo(() => {
    return movements.filter(
      (m) => m.type === "DEVOLUCAO" || m.type === "AVARIA" || m.type === "PERDA"
    );
  }, [movements]);

  const filtered = useMemo(() => {
    return returnMovements.filter((m) => {
      const matchPartner = partnerFilter === "ALL" || m.locationId === partnerFilter;
      const matchType = typeFilter === "ALL" || m.type === typeFilter;
      const matchSearch =
        searchTerm === "" ||
        m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.reason && m.reason.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchPartner && matchType && matchSearch;
    });
  }, [returnMovements, partnerFilter, typeFilter, searchTerm]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  return (
    <div className="space-y-4">
      {/* Barra de Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-[#101827]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por produto, parceiro ou motivo..."
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
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">Todas as Ocorrências</option>
            <option value="DEVOLUCAO">Devoluções Normais</option>
            <option value="AVARIA">Avarias (Danificados)</option>
            <option value="PERDA">Perdas / Extravios</option>
          </select>

          <select
            value={partnerFilter}
            onChange={(e) => {
              setPartnerFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">Todos os Parceiros</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Devolução</span>
          </button>
        </div>
      </div>

      {/* Tabela de Devoluções */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl">
        {loading && returnMovements.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Carregando histórico de devoluções...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Nenhuma devolução ou avaria registrada com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0c121e] text-slate-400 font-medium">
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Parceiro</th>
                  <th className="py-3.5 px-4">Produto</th>
                  <th className="py-3.5 px-4 text-center">Tipo</th>
                  <th className="py-3.5 px-4 text-center">Quantidade</th>
                  <th className="py-3.5 px-4 text-right">Valor Estimado</th>
                  <th className="py-3.5 px-4">Motivo / Justificativa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginated.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{m.location.name}</div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200">{m.productName}</td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type === "DEVOLUCAO"
                            ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                            : m.type === "AVARIA"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-red-500/15 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {m.type === "DEVOLUCAO"
                          ? "Devolução"
                          : m.type === "AVARIA"
                          ? "Avaria"
                          : "Perda"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-white">
                      {Math.abs(m.quantity)} un
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-300">
                      R$ {Number(m.totalValue).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {m.reason || "Sem observações registradas."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé Paginação */}
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-[#0c121e] text-xs text-slate-400">
            <span>
              Mostrando {paginated.length} de {filtered.length} devoluções
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
