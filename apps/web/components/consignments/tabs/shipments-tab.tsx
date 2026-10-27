"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Truck,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Printer,
  Plus,
  Package,
} from "lucide-react";
import type { ConsignmentShipment, ConsignmentPartner } from "@/lib/server-consignments";

type ShipmentsTabProps = {
  shipments: ConsignmentShipment[];
  partners: ConsignmentPartner[];
  loading: boolean;
  onOpenCreateModal: () => void;
};

export function ShipmentsTab({
  shipments,
  partners,
  loading,
  onOpenCreateModal,
}: ShipmentsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredShipments = useMemo(() => {
    return shipments.filter((sh) => {
      const matchPartner = partnerFilter === "ALL" || sh.locationId === partnerFilter;
      const matchSearch =
        searchTerm === "" ||
        sh.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sh.location.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchPartner && matchSearch;
    });
  }, [shipments, partnerFilter, searchTerm]);

  // Impressão profissional de Romaneio de Envio de Consignação
  const handlePrintShipment = (sh: ConsignmentShipment) => {
    const itemRows = sh.items
      .map(
        (it, idx) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${idx + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">
          <strong>${it.productName}</strong>
          ${it.sku ? `<br><small style="color: #666;">SKU: ${it.sku}</small>` : ""}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center; font-weight: bold;">${it.quantity} un</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">R$ ${Number(it.salePrice).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${it.minPrice ? `R$ ${Number(it.minPrice).toFixed(2)}` : "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${it.commissionRate ? `${it.commissionRate}%` : "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">
          R$ ${(it.quantity * Number(it.salePrice)).toFixed(2)}
        </td>
      </tr>
    `
      )
      .join("");

    const totalQty = sh.items.reduce((sum, it) => sum + it.quantity, 0);

    const printHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Documento de Envio - ${sh.code}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; padding: 30px; font-size: 13px; line-height: 1.5; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand { font-size: 22px; font-weight: 800; color: #0f172a; }
          .brand span { color: #0284c7; }
          .doc-num { font-size: 16px; font-weight: 700; color: #0284c7; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
          th { background: #f1f5f9; padding: 10px 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
          .totals { margin-left: auto; width: 320px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 30px; }
          .totals div { display: flex; justify-content: space-between; margin-bottom: 6px; }
          .totals .main-total { font-size: 15px; font-weight: 700; color: #0284c7; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; text-align: center; }
          .sig-line { border-top: 1px solid #334155; padding-top: 6px; font-size: 12px; font-weight: 500; }
          @media print { button { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">CTRL<span>+FARM</span></div>
            <div style="font-size: 12px; color: #64748b;">Gestão Profissional de Impressão 3D e Consignados</div>
          </div>
          <div style="text-align: right;">
            <div class="doc-num">REMESSA Nº ${sh.code}</div>
            <div style="font-size: 11px; color: #64748b;">Data de Emissão: ${new Date(sh.sentAt).toLocaleDateString("pt-BR")}</div>
          </div>
        </div>

        <div class="info-grid">
          <div>
            <strong>DESTINATÁRIO (PARCEIRO COMERCIAL):</strong><br>
            <strong>${sh.location.name}</strong><br>
            Cidade: ${sh.location.city} - ${sh.location.state}
          </div>
          <div>
            <strong>ORIGEM (CONSIGNANTE):</strong><br>
            CTRL-Farm Produção 3D & Manufatura Digital<br>
            Status do Envio: ${sh.status}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th>Produto / Descrição</th>
              <th style="width: 80px; text-align: center;">Qtd</th>
              <th style="width: 100px; text-align: right;">Preço Venda</th>
              <th style="width: 90px; text-align: right;">Preço Mín.</th>
              <th style="width: 80px; text-align: right;">Comissão</th>
              <th style="width: 110px; text-align: right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="totals">
          <div><span>Quantidade Total de Peças:</span><strong>${totalQty} unidades</strong></div>
          <div class="main-total"><span>Valor Total da Remessa:</span><span>R$ ${Number(sh.totalSaleValue).toFixed(2)}</span></div>
        </div>

        ${sh.notes ? `<div style="margin-bottom: 30px; padding: 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; font-size: 11px; color: #92400e;"><strong>Condições & Observações:</strong> ${sh.notes}</div>` : ""}

        <div class="signatures">
          <div>
            <div class="sig-line">Responsável pela Expedição (CTRL-Farm)</div>
          </div>
          <div>
            <div class="sig-line">Recebido por (${sh.location.name})</div>
          </div>
        </div>

        <script>
          window.print();
        </script>
      </body>
      </html>
    `;

    const printWin = window.open("", "_blank");
    if (printWin) {
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros & Ação */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-[#101827]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por código do envio ou parceiro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
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
            className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Envio</span>
          </button>
        </div>
      </div>

      {/* Lista de Envios */}
      <div className="space-y-3">
        {loading && shipments.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Carregando remessas de envio...
          </div>
        ) : filteredShipments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 rounded-2xl border border-slate-800 bg-[#101827]">
            Nenhum documento de envio encontrado com os filtros aplicados.
          </div>
        ) : (
          filteredShipments.map((sh) => {
            const isExpanded = expandedId === sh.id;
            const totalItemsCount = sh.items.reduce((s, it) => s + it.quantity, 0);

            return (
              <div
                key={sh.id}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl transition"
              >
                {/* Linha Resumo do Envio */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">
                          {sh.code}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                          {sh.status === "DELIVERED"
                            ? "Entregue"
                            : sh.status === "SENT"
                            ? "Enviado"
                            : "Rascunho"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 font-semibold text-slate-300">
                          <Building2 className="h-3 w-3 text-cyan-400" />
                          {sh.location.name} ({sh.location.city})
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(sh.sentAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Peças</span>
                      <span className="font-bold text-white text-sm">{totalItemsCount} un</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Valor da Remessa</span>
                      <span className="font-bold text-emerald-400 text-sm">
                        R$ {Number(sh.totalSaleValue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePrintShipment(sh)}
                        className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 p-2 text-slate-300 hover:text-white transition"
                        title="Imprimir Romaneio de Envio"
                      >
                        <Printer className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : sh.id)}
                        className="rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition flex items-center gap-1"
                      >
                        <span>{isExpanded ? "Ocultar" : "Itens"}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Detalhes dos Itens (Accordion) */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-[#0c121e] p-4 text-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                            <th className="py-2 px-3">Produto</th>
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3 text-center">Quantidade</th>
                            <th className="py-2 px-3 text-right">Custo</th>
                            <th className="py-2 px-3 text-right">Preço Venda</th>
                            <th className="py-2 px-3 text-right">Preço Mínimo</th>
                            <th className="py-2 px-3 text-right">Comissão</th>
                            <th className="py-2 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40 text-slate-300">
                          {sh.items.map((it) => (
                            <tr key={it.id} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 font-medium text-white">{it.productName}</td>
                              <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                                {it.sku || "-"}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-white">
                                {it.quantity} un
                              </td>
                              <td className="py-2 px-3 text-right text-slate-400">
                                R$ {Number(it.costPrice).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-emerald-400">
                                R$ {Number(it.salePrice).toFixed(2)}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-400">
                                {it.minPrice ? `R$ ${Number(it.minPrice).toFixed(2)}` : "-"}
                              </td>
                              <td className="py-2 px-3 text-right text-cyan-300 font-semibold">
                                {it.commissionRate ? `${it.commissionRate}%` : "-"}
                              </td>
                              <td className="py-2 px-3 text-right font-bold text-white">
                                R$ {(it.quantity * Number(it.salePrice)).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {sh.notes && (
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                        <strong className="text-slate-300">Observações:</strong> {sh.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
