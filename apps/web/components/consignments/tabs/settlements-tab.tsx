"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Receipt,
  DollarSign,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Printer,
  CreditCard,
} from "lucide-react";
import type { ConsignmentSettlement, ConsignmentPartner } from "@/lib/server-consignments";

type SettlementsTabProps = {
  settlements: ConsignmentSettlement[];
  partners: ConsignmentPartner[];
  loading: boolean;
  onOpenCreateModal: () => void;
  onOpenPaymentModal: (settlement: ConsignmentSettlement) => void;
};

export function SettlementsTab({
  settlements,
  partners,
  loading,
  onOpenCreateModal,
  onOpenPaymentModal,
}: SettlementsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = useMemo(() => {
    return settlements.filter((st) => {
      const matchPartner = partnerFilter === "ALL" || st.locationId === partnerFilter;
      const matchStatus = statusFilter === "ALL" || st.status === statusFilter;
      const matchSearch =
        searchTerm === "" ||
        st.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.location.name.toLowerCase().includes(searchTerm.toLowerCase());

      return matchPartner && matchStatus && matchSearch;
    });
  }, [settlements, partnerFilter, statusFilter, searchTerm]);

  // Resumo financeiro de acertos
  const summary = useMemo(() => {
    let totalToReceive = 0;
    let totalReceived = 0;
    let overdueCount = 0;

    const now = new Date();
    for (const st of filtered) {
      totalReceived += Number(st.totalPaid);
      totalToReceive += Number(st.balanceDue);
      if (st.status === "OVERDUE" || (new Date(st.dueDate) < now && Number(st.balanceDue) > 0)) {
        overdueCount++;
      }
    }

    return { totalToReceive, totalReceived, overdueCount };
  }, [filtered]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // Impressão profissional de Fechamento / Extrato Financeiro
  const handlePrintSettlement = (st: ConsignmentSettlement) => {
    const paymentRows = (st.payments || [])
      .map(
        (p, idx) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;">${new Date(p.paidAt).toLocaleDateString("pt-BR")}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;">${p.method}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #ddd;">${p.transactionReference || "-"}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold; color: #047857;">
          R$ ${Number(p.amount).toFixed(2)}
        </td>
      </tr>
    `
      )
      .join("");

    const printHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Extrato de Acerto - ${st.code}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; padding: 30px; font-size: 13px; line-height: 1.5; }
          .header { border-bottom: 2px solid #0891b2; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand { font-size: 22px; font-weight: 800; color: #0f172a; }
          .brand span { color: #0891b2; }
          .doc-num { font-size: 16px; font-weight: 700; color: #0891b2; }
          .card-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
          .stat-val { font-size: 16px; font-weight: 700; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
          th { background: #f1f5f9; padding: 8px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
          .total-box { margin-left: auto; width: 320px; padding: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; margin-bottom: 30px; }
          .total-box div { display: flex; justify-content: space-between; margin-bottom: 6px; }
          @media print { button { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">CTRL<span>+FARM</span></div>
            <div style="font-size: 12px; color: #64748b;">Fechamento de Acerto Financeiro de Consignação</div>
          </div>
          <div style="text-align: right;">
            <div class="doc-num">ACERTO Nº ${st.code}</div>
            <div style="font-size: 11px; color: #64748b;">Vencimento: ${new Date(st.dueDate).toLocaleDateString("pt-BR")}</div>
          </div>
        </div>

        <div class="card-summary">
          <div>
            <span style="font-size: 11px; color: #64748b;">Parceiro Comercial:</span>
            <div class="stat-val">${st.location.name}</div>
          </div>
          <div>
            <span style="font-size: 11px; color: #64748b;">Período Apurado:</span>
            <div class="stat-val">${new Date(st.startDate).toLocaleDateString("pt-BR")} a ${new Date(st.endDate).toLocaleDateString("pt-BR")}</div>
          </div>
          <div>
            <span style="font-size: 11px; color: #64748b;">Situação:</span>
            <div class="stat-val" style="color: ${st.status === "PAID" ? "#047857" : "#b45309"};">${st.status}</div>
          </div>
        </div>

        <div class="total-box">
          <div><span>Vendas Brutas do Período:</span><strong>R$ ${Number(st.totalGrossSales).toFixed(2)}</strong></div>
          <div><span>Comissão Retida pelo Parceiro:</span><span style="color: #b45309;">- R$ ${Number(st.totalPartnerCommission).toFixed(2)}</span></div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 6px; font-weight: bold;">
            <span>Líquido Devido à Farm:</span>
            <span>R$ ${Number(st.totalFarmRevenue).toFixed(2)}</span>
          </div>
          <div><span>Total Pago:</span><strong style="color: #047857;">R$ ${Number(st.totalPaid).toFixed(2)}</strong></div>
          <div style="border-top: 2px solid #059669; padding-top: 6px; font-size: 15px; font-weight: 800; color: #047857;">
            <span>Saldo em Aberto:</span>
            <span>R$ ${Number(st.balanceDue).toFixed(2)}</span>
          </div>
        </div>

        ${
          st.payments && st.payments.length > 0
            ? `
          <h4 style="margin-bottom: 8px;">Histórico de Pagamentos Recebidos</h4>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Data Pagamento</th>
                <th>Forma</th>
                <th>Comprovante / Referência</th>
                <th style="text-align: right;">Valor Pago</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows}
            </tbody>
          </table>
        `
            : `<p style="font-size: 12px; color: #64748b;">Nenhum pagamento registrado para este acerto até o momento.</p>`
        }

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
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Total a Receber</span>
          <span className="text-2xl font-bold text-amber-400">
            R$ {summary.totalToReceive.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Saldo pendente nos fechamentos</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Total Já Recebido</span>
          <span className="text-2xl font-bold text-emerald-400">
            R$ {summary.totalReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Valores baixados e confirmados</p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#101827]">
          <span className="text-[11px] text-slate-400 block">Acertos Vencidos</span>
          <span
            className={`text-2xl font-bold ${
              summary.overdueCount > 0 ? "text-red-400" : "text-slate-300"
            }`}
          >
            {summary.overdueCount} {summary.overdueCount === 1 ? "acerto" : "acertos"}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary.overdueCount > 0 ? "Requer cobrança com o parceiro" : "Tudo em dia"}
          </p>
        </div>
      </div>

      {/* Barra de Busca & Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-[#101827]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por código de acerto ou parceiro..."
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 focus:outline-none"
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDING">Pendentes</option>
            <option value="PARTIAL">Parcialmente Pagos</option>
            <option value="PAID">Pagos / Quitados</option>
            <option value="OVERDUE">Vencidos / Atrasados</option>
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
            className="rounded-xl bg-cyan-600 hover:bg-cyan-500 px-4 py-2 text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-cyan-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Acerto</span>
          </button>
        </div>
      </div>

      {/* Tabela de Acertos */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl">
        {loading && settlements.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-400">
            Carregando acertos financeiros...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Nenhum acerto financeiro encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-[#0c121e] text-slate-400 font-medium">
                  <th className="py-3.5 px-4">Código</th>
                  <th className="py-3.5 px-4">Parceiro</th>
                  <th className="py-3.5 px-4">Período</th>
                  <th className="py-3.5 px-4 text-right">Vendas Brutas</th>
                  <th className="py-3.5 px-4 text-right">Comissões</th>
                  <th className="py-3.5 px-4 text-right">Devido Farm</th>
                  <th className="py-3.5 px-4 text-right">Total Pago</th>
                  <th className="py-3.5 px-4 text-right">Saldo Devedor</th>
                  <th className="py-3.5 px-4">Vencimento</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {paginated.map((st) => {
                  const isOverdue =
                    st.status === "OVERDUE" ||
                    (new Date(st.dueDate) < new Date() && Number(st.balanceDue) > 0);

                  return (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white text-xs">
                        {st.code}
                      </td>

                      <td className="py-3 px-4 font-semibold text-white">
                        {st.location.name}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(st.startDate).toLocaleDateString("pt-BR")} a{" "}
                        {new Date(st.endDate).toLocaleDateString("pt-BR")}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-300">
                        R$ {Number(st.totalGrossSales).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right text-amber-400">
                        R$ {Number(st.totalPartnerCommission).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-cyan-300">
                        R$ {Number(st.totalFarmRevenue).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                        R$ {Number(st.totalPaid).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-right font-bold text-white">
                        R$ {Number(st.balanceDue).toFixed(2)}
                      </td>

                      <td className="py-3 px-4 text-[11px] font-mono">
                        <span className={isOverdue ? "text-red-400 font-bold" : "text-slate-300"}>
                          {new Date(st.dueDate).toLocaleDateString("pt-BR")}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            st.status === "PAID"
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : isOverdue
                              ? "bg-red-500/15 text-red-400 border border-red-500/30"
                              : st.status === "PARTIAL"
                              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                              : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          }`}
                        >
                          {st.status === "PAID"
                            ? "Pago"
                            : isOverdue
                            ? "Atrasado"
                            : st.status === "PARTIAL"
                            ? "Parcial"
                            : "Pendente"}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {Number(st.balanceDue) > 0 && (
                            <button
                              type="button"
                              onClick={() => onOpenPaymentModal(st)}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 px-2 py-1 text-xs font-semibold flex items-center gap-1 transition"
                              title="Registrar pagamento deste acerto"
                            >
                              <DollarSign className="h-3 w-3" />
                              <span>Pagar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handlePrintSettlement(st)}
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                            title="Imprimir extrato do acerto"
                          >
                            <Printer className="h-3.5 w-3.5" />
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
        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800 bg-[#0c121e] text-xs text-slate-400">
            <span>
              Mostrando {paginated.length} de {filtered.length} acertos
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
