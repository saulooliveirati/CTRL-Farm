"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Building2,
  MapPin,
  Phone,
  MessageCircle,
  ExternalLink,
  Edit2,
  Trash2,
  Plus,
  Package,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import type { ConsignmentPartner } from "@/lib/server-consignments";

type PartnersTabProps = {
  partners: ConsignmentPartner[];
  loading: boolean;
  onOpenCreateModal: () => void;
  onOpenEditModal: (partner: ConsignmentPartner) => void;
  onOpenShipmentForPartner: (partnerId: string) => void;
  onDeletePartner: (partnerId: string) => void;
};

export function PartnersTab({
  partners,
  loading,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenShipmentForPartner,
  onDeletePartner,
}: PartnersTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [cityFilter, setCityFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Lista de cidades únicas para filtro
  const cities = useMemo(() => {
    const list = Array.from(new Set(partners.map((p) => p.city).filter(Boolean)));
    return list.sort();
  }, [partners]);

  // Filtros combinados e busca instantânea
  const filteredPartners = useMemo(() => {
    return partners.filter((p) => {
      const matchSearch =
        searchTerm === "" ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.responsibleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.corporateName && p.corporateName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.document && p.document.includes(searchTerm)) ||
        p.city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchCity = cityFilter === "ALL" || p.city === cityFilter;

      return matchSearch && matchStatus && matchCity;
    });
  }, [partners, searchTerm, statusFilter, cityFilter]);

  // Paginação
  const totalPages = Math.ceil(filteredPartners.length / itemsPerPage) || 1;
  const paginatedPartners = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPartners.slice(start, start + itemsPerPage);
  }, [filteredPartners, currentPage]);

  const handleWhatsApp = (whatsapp?: string | null, phone?: string) => {
    const target = whatsapp || phone;
    if (!target) return;
    const clean = target.replace(/\D/g, "");
    const formatted = clean.startsWith("55") ? clean : `55${clean}`;
    window.open(`https://wa.me/${formatted}`, "_blank");
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros & Ações */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-[#101827]">
        {/* Busca Instantânea */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por parceiro, responsável, CNPJ/CPF ou cidade..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Filtros de Status e Cidade */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
            <option value="SUSPENDED">Suspensos</option>
          </select>

          {cities.length > 0 && (
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">Todas as Cidades ({cities.length})</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Parceiro</span>
          </button>
        </div>
      </div>

      {/* Tabela Responsiva de Parceiros (DataTable) */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl">
        {loading && partners.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Carregando parceiros cadastrados...
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Nenhum parceiro encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0c121e] text-slate-400 font-medium">
                  <th className="py-3.5 px-4">Estabelecimento / Razão</th>
                  <th className="py-3.5 px-4">Responsável</th>
                  <th className="py-3.5 px-4">Contatos</th>
                  <th className="py-3.5 px-4">Localização</th>
                  <th className="py-3.5 px-4">Comissão Padrão</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginatedPartners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-slate-800/40 transition group"
                  >
                    {/* Nome & Documento */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs">{partner.name}</div>
                      {partner.corporateName && (
                        <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                          {partner.corporateName}
                        </div>
                      )}
                      {partner.document && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {partner.document}
                        </div>
                      )}
                    </td>

                    {/* Responsável */}
                    <td className="py-3.5 px-4">
                      <span className="text-white font-medium">{partner.responsibleName}</span>
                    </td>

                    {/* Contatos & WhatsApp */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-300">{partner.phone}</span>
                          {(partner.whatsapp || partner.phone) && (
                            <button
                              type="button"
                              onClick={() => handleWhatsApp(partner.whatsapp, partner.phone)}
                              className="text-emerald-400 hover:text-emerald-300 transition"
                              title="Abrir conversa no WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {partner.email && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {partner.email}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Localização */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                        <span className="font-semibold text-white">
                          {partner.city} - {partner.state}
                        </span>
                      </div>
                      {partner.googleMapsUrl && (
                        <a
                          href={partner.googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <span>Ver no Mapa</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </td>

                    {/* Comissão */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                        {partner.defaultCommissionType === "FIXED"
                          ? `R$ ${Number(partner.defaultCommissionRate).toFixed(2)} / un`
                          : `${Number(partner.defaultCommissionRate)}%`}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          partner.status === "ACTIVE"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : partner.status === "SUSPENDED"
                            ? "bg-red-500/15 text-red-400 border border-red-500/30"
                            : "bg-slate-700/40 text-slate-400 border border-slate-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            partner.status === "ACTIVE"
                              ? "bg-emerald-400"
                              : partner.status === "SUSPENDED"
                              ? "bg-red-400"
                              : "bg-slate-500"
                          }`}
                        />
                        {partner.status === "ACTIVE"
                          ? "Ativo"
                          : partner.status === "SUSPENDED"
                          ? "Suspenso"
                          : "Inativo"}
                      </span>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenShipmentForPartner(partner.id)}
                          className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 transition"
                          title="Enviar produtos para este parceiro"
                        >
                          <Package className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenEditModal(partner)}
                          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                          title="Editar cadastro"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePartner(partner.id)}
                          className="p-1.5 rounded-lg border border-slate-800 text-slate-500 hover:border-red-500/30 hover:bg-red-950/30 hover:text-red-400 transition"
                          title="Excluir parceiro"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com Paginação */}
        {filteredPartners.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-[#0c121e] text-xs text-slate-400">
            <span>
              Mostrando {paginatedPartners.length} de {filteredPartners.length} parceiros
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
