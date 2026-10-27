"use client";

import { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Download,
  Filter,
  Calendar,
  Building2,
  Package,
  Printer,
  Table as TableIcon,
  FileSpreadsheet,
  FileCode,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import type { ConsignmentPartner } from "@/lib/server-consignments";

type ReportsTabProps = {
  partners: ConsignmentPartner[];
};

type ReportType =
  | "PARTNERS"
  | "PRODUCTS"
  | "MOVEMENTS"
  | "FINANCIAL"
  | "COMMISSIONS"
  | "PROFIT"
  | "STOCK";

export function ReportsTab({ partners }: ReportsTabProps) {
  const [reportType, setReportType] = useState<ReportType>("FINANCIAL");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedPartnerId, setSelectedPartnerId] = useState("ALL");
  const [productNameFilter, setProductNameFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("ALL");

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  // Lista de cidades para filtro
  const cities = useMemo(() => {
    return Array.from(new Set(partners.map((p) => p.city).filter(Boolean))).sort();
  }, [partners]);

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", new Date(startDate).toISOString());
    if (endDate) params.set("endDate", new Date(endDate).toISOString());
    if (selectedPartnerId !== "ALL") params.set("locationId", selectedPartnerId);
    if (productNameFilter.trim()) params.set("productName", productNameFilter.trim());
    if (cityFilter !== "ALL") params.set("city", cityFilter);

    fetch(`/api/consignments/reports?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setReportData(data.data ?? data ?? null);
      })
      .catch(() => {
        setReportData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, [reportType, startDate, endDate, selectedPartnerId, cityFilter]);

  // GERAÇÃO DE EXPORTAÇÃO CSV
  const handleExportCSV = () => {
    if (!reportData) return;

    let headers: string[] = [];
    let rows: Array<Array<string | number>> = [];
    let filename = `relatorio-${reportType.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;

    switch (reportType) {
      case "FINANCIAL":
      case "PROFIT":
      case "COMMISSIONS":
        headers = ["Data", "Parceiro", "Produto", "Qtd", "Preço Venda", "Desconto", "Bruto", "Comissão", "Receita Farm", "Lucro Líquido"];
        rows = (reportData.sales || []).map((s: any) => [
          new Date(s.soldAt).toLocaleDateString("pt-BR"),
          `"${s.location.name}"`,
          `"${s.productName}"`,
          s.quantity,
          Number(s.unitPrice).toFixed(2),
          Number(s.discount).toFixed(2),
          Number(s.grossAmount).toFixed(2),
          Number(s.partnerCommission).toFixed(2),
          Number(s.farmRevenue).toFixed(2),
          Number(s.netProfit).toFixed(2),
        ]);
        break;

      case "STOCK":
        headers = ["Parceiro", "Cidade", "Produto", "SKU", "Disponível", "Vendido", "Devolvido", "Avariado", "Preço Unitário", "Total em Estoque"];
        rows = (reportData.stocks || []).map((st: any) => [
          `"${st.location.name}"`,
          `"${st.location.city}"`,
          `"${st.productName}"`,
          `"${st.sku || ""}"`,
          st.quantityAvailable,
          st.quantitySold,
          st.quantityReturned,
          st.quantityDamaged,
          Number(st.sellingPrice).toFixed(2),
          (st.quantityAvailable * Number(st.sellingPrice)).toFixed(2),
        ]);
        break;

      case "PARTNERS":
        headers = ["Nome", "Responsável", "Telefone", "Cidade", "Estado", "Comissão Padrão", "Status"];
        rows = (partners || []).map((p) => [
          `"${p.name}"`,
          `"${p.responsibleName}"`,
          `"${p.phone}"`,
          `"${p.city}"`,
          `"${p.state}"`,
          p.defaultCommissionType === "FIXED" ? `R$ ${p.defaultCommissionRate}` : `${p.defaultCommissionRate}%`,
          p.status,
        ]);
        break;

      case "MOVEMENTS":
        headers = ["Data", "Parceiro", "Tipo", "Produto", "Quantidade", "Saldo Anterior", "Novo Saldo", "Valor Total", "Motivo"];
        rows = (reportData.movements || []).map((m: any) => [
          new Date(m.createdAt).toLocaleDateString("pt-BR"),
          `"${m.location.name}"`,
          m.type,
          `"${m.productName}"`,
          m.quantity,
          m.previousBalance,
          m.newBalance,
          Number(m.totalValue).toFixed(2),
          `"${m.reason || ""}"`,
        ]);
        break;

      case "PRODUCTS":
        headers = ["Produto", "Total em Consignação", "Total Vendido", "Total Devolvido", "Total Avariado"];
        rows = (reportData.stocks || []).map((st: any) => [
          `"${st.productName}"`,
          st.quantityAvailable,
          st.quantitySold,
          st.quantityReturned,
          st.quantityDamaged,
        ]);
        break;
    }

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // GERAÇÃO DE EXPORTAÇÃO EXCEL (.XLS / XML)
  const handleExportExcel = () => {
    if (!reportData) return;

    let headers: string[] = [];
    let rows: Array<Array<string | number>> = [];
    let reportTitle = `Relatório de Consignados - ${reportType}`;

    switch (reportType) {
      case "FINANCIAL":
      case "PROFIT":
      case "COMMISSIONS":
        headers = ["Data", "Parceiro", "Produto", "Qtd", "Preço Venda", "Desconto", "Bruto", "Comissão", "Receita Farm", "Lucro Líquido"];
        rows = (reportData.sales || []).map((s: any) => [
          new Date(s.soldAt).toLocaleDateString("pt-BR"),
          s.location.name,
          s.productName,
          s.quantity,
          `R$ ${Number(s.unitPrice).toFixed(2)}`,
          `R$ ${Number(s.discount).toFixed(2)}`,
          `R$ ${Number(s.grossAmount).toFixed(2)}`,
          `R$ ${Number(s.partnerCommission).toFixed(2)}`,
          `R$ ${Number(s.farmRevenue).toFixed(2)}`,
          `R$ ${Number(s.netProfit).toFixed(2)}`,
        ]);
        break;

      case "STOCK":
        headers = ["Parceiro", "Cidade", "Produto", "SKU", "Disponível", "Vendido", "Devolvido", "Avariado", "Preço Unitário", "Total em Estoque"];
        rows = (reportData.stocks || []).map((st: any) => [
          st.location.name,
          st.location.city,
          st.productName,
          st.sku || "-",
          st.quantityAvailable,
          st.quantitySold,
          st.quantityReturned,
          st.quantityDamaged,
          `R$ ${Number(st.sellingPrice).toFixed(2)}`,
          `R$ ${(st.quantityAvailable * Number(st.sellingPrice)).toFixed(2)}`,
        ]);
        break;

      default:
        handleExportCSV();
        return;
    }

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>CTRL-Farm</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>
        <h2>${reportTitle}</h2>
        <p>Gerado em: ${new Date().toLocaleDateString("pt-BR")}</p>
        <table border="1">
          <thead>
            <tr style="background-color: #0284c7; color: white;">
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ctrlfarm-consignados-${reportType.toLowerCase()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // GERAÇÃO DE EXPORTAÇÃO PDF TIMBRADO PROFISSIONAL
  const handleExportPDF = () => {
    if (!reportData) return;

    let tableHeadersHtml = "";
    let tableRowsHtml = "";
    let summaryCardsHtml = "";

    if (reportType === "FINANCIAL" || reportType === "PROFIT" || reportType === "COMMISSIONS") {
      tableHeadersHtml = `
        <th>Data</th>
        <th>Parceiro</th>
        <th>Produto</th>
        <th style="text-align: center;">Qtd</th>
        <th style="text-align: right;">Preço Venda</th>
        <th style="text-align: right;">Bruto</th>
        <th style="text-align: right;">Comissão</th>
        <th style="text-align: right;">Receita Farm</th>
        <th style="text-align: right;">Lucro Líquido</th>
      `;

      tableRowsHtml = (reportData.sales || [])
        .map(
          (s: any) => `
        <tr>
          <td>${new Date(s.soldAt).toLocaleDateString("pt-BR")}</td>
          <td><strong>${s.location.name}</strong></td>
          <td>${s.productName}</td>
          <td style="text-align: center;">${s.quantity} un</td>
          <td style="text-align: right;">R$ ${Number(s.unitPrice).toFixed(2)}</td>
          <td style="text-align: right;">R$ ${Number(s.grossAmount).toFixed(2)}</td>
          <td style="text-align: right; color: #b45309;">R$ ${Number(s.partnerCommission).toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold; color: #0284c7;">R$ ${Number(s.farmRevenue).toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold; color: #047857;">R$ ${Number(s.netProfit).toFixed(2)}</td>
        </tr>
      `
        )
        .join("");

      const sm = reportData.summary || {};
      summaryCardsHtml = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
          <div style="padding: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
            <div style="font-size: 11px; color: #64748b;">Total Bruto Vendido:</div>
            <div style="font-size: 16px; font-weight: bold; color: #0f172a;">R$ ${Number(sm.totalGross || 0).toFixed(2)}</div>
          </div>
          <div style="padding: 10px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px;">
            <div style="font-size: 11px; color: #92400e;">Comissões Retidas:</div>
            <div style="font-size: 16px; font-weight: bold; color: #b45309;">R$ ${Number(sm.totalCommissions || 0).toFixed(2)}</div>
          </div>
          <div style="padding: 10px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px;">
            <div style="font-size: 11px; color: #0369a1;">Receita Líquida Farm:</div>
            <div style="font-size: 16px; font-weight: bold; color: #0284c7;">R$ ${Number(sm.totalRevenue || 0).toFixed(2)}</div>
          </div>
          <div style="padding: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px;">
            <div style="font-size: 11px; color: #166534;">Lucro Líquido Real:</div>
            <div style="font-size: 16px; font-weight: bold; color: #047857;">R$ ${Number(sm.totalProfit || 0).toFixed(2)}</div>
          </div>
        </div>
      `;
    } else if (reportType === "STOCK") {
      tableHeadersHtml = `
        <th>Parceiro</th>
        <th>Cidade</th>
        <th>Produto</th>
        <th>SKU</th>
        <th style="text-align: center;">Disponível</th>
        <th style="text-align: center;">Vendido</th>
        <th style="text-align: center;">Devolvido</th>
        <th style="text-align: right;">Preço Venda</th>
        <th style="text-align: right;">Total em Estoque</th>
      `;

      tableRowsHtml = (reportData.stocks || [])
        .map(
          (st: any) => `
        <tr>
          <td><strong>${st.location.name}</strong></td>
          <td>${st.location.city}</td>
          <td>${st.productName}</td>
          <td>${st.sku || "-"}</td>
          <td style="text-align: center; font-weight: bold;">${st.quantityAvailable} un</td>
          <td style="text-align: center;">${st.quantitySold}</td>
          <td style="text-align: center;">${st.quantityReturned}</td>
          <td style="text-align: right;">R$ ${Number(st.sellingPrice).toFixed(2)}</td>
          <td style="text-align: right; font-weight: bold; color: #0284c7;">R$ ${(st.quantityAvailable * Number(st.sellingPrice)).toFixed(2)}</td>
        </tr>
      `
        )
        .join("");
    } else {
      handleExportCSV();
      return;
    }

    const printHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatório Analítico de Consignados - CTRL-Farm</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #1e293b; padding: 30px; font-size: 12px; line-height: 1.5; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 14px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
          .brand { font-size: 20px; font-weight: 800; color: #0f172a; }
          .brand span { color: #0284c7; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th { background: #f1f5f9; padding: 8px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #cbd5e1; }
          td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background-color: #f8fafc; }
          @media print { button { display: none; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">CTRL<span>+FARM</span></div>
            <div style="font-size: 11px; color: #64748b;">Relatório Analítico de Consignação · Tipo: ${reportType}</div>
          </div>
          <div style="text-align: right; font-size: 11px; color: #64748b;">
            Período: ${new Date(startDate).toLocaleDateString("pt-BR")} a ${new Date(endDate).toLocaleDateString("pt-BR")}<br>
            Emissão: ${new Date().toLocaleDateString("pt-BR")}
          </div>
        </div>

        ${summaryCardsHtml}

        <table>
          <thead>
            <tr>${tableHeadersHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 30px; font-size: 10px; color: #94a3b8; text-align: center;">
          CTRL-Farm - Sistema Integrado de Gestão de Impressão 3D e Consignados
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
    <div className="space-y-5">
      {/* Barra de Filtros do Relatório */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#101827] shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Central de Relatórios de Consignados</h3>
              <p className="text-xs text-slate-400">
                Filtre por período, parceiro ou produto e exporte em múltiplos formatos
              </p>
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="rounded-xl border border-red-500/30 bg-red-950/40 hover:bg-red-900/60 text-red-300 px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Exportar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Exportar Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 px-3 py-1.5 text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Linha de Seleção dos Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Tipo de Relatório</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white font-medium focus:border-cyan-500 focus:outline-none"
            >
              <option value="FINANCIAL">Financeiro & Vendas</option>
              <option value="PROFIT">Lucro Líquido Real</option>
              <option value="COMMISSIONS">Comissões dos Parceiros</option>
              <option value="STOCK">Estoque Consignado</option>
              <option value="PARTNERS">Cadastro de Parceiros</option>
              <option value="MOVEMENTS">Histórico de Movimentações</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Parceiro Específico</label>
            <select
              value={selectedPartnerId}
              onChange={(e) => setSelectedPartnerId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">Todos os Parceiros</option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {cities.length > 0 && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Cidade</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="ALL">Todas as Cidades</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Pré-visualização dos Dados do Relatório */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#101827] shadow-xl">
        <div className="px-5 py-3 border-b border-slate-800 bg-[#0c121e] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-white font-bold">
            <TableIcon className="h-4 w-4 text-cyan-400" />
            <span>Prévia do Relatório Selecionado</span>
          </div>
          {loading && <span className="text-cyan-400 font-medium">Carregando dados...</span>}
        </div>

        {loading ? (
          <div className="py-20 text-center text-xs text-slate-400">Processando consulta analítica...</div>
        ) : !reportData ? (
          <div className="py-16 text-center text-xs text-slate-500">
            Nenhum dado retornado para os parâmetros de filtro informados.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            {/* Visualização de Relatório Financeiro / Vendas */}
            {(reportType === "FINANCIAL" || reportType === "PROFIT" || reportType === "COMMISSIONS") && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0c121e] text-slate-400 font-medium">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Parceiro</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4 text-center">Qtd</th>
                    <th className="py-3 px-4 text-right">Preço Unit.</th>
                    <th className="py-3 px-4 text-right">Bruto</th>
                    <th className="py-3 px-4 text-right">Comissão</th>
                    <th className="py-3 px-4 text-right">Receita Farm</th>
                    <th className="py-3 px-4 text-right">Lucro Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(reportData.sales || []).map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(s.soldAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-white">{s.location.name}</td>
                      <td className="py-2.5 px-4">{s.productName}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-white">{s.quantity} un</td>
                      <td className="py-2.5 px-4 text-right text-slate-400">
                        R$ {Number(s.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-200">
                        R$ {Number(s.grossAmount).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-amber-400 font-semibold">
                        R$ {Number(s.partnerCommission).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-cyan-300">
                        R$ {Number(s.farmRevenue).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                        R$ {Number(s.netProfit).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Visualização de Estoque */}
            {reportType === "STOCK" && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0c121e] text-slate-400 font-medium">
                    <th className="py-3 px-4">Parceiro</th>
                    <th className="py-3 px-4">Cidade</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4 text-center">Disponível</th>
                    <th className="py-3 px-4 text-center">Vendido</th>
                    <th className="py-3 px-4 text-center">Devolvido</th>
                    <th className="py-3 px-4 text-right">Preço Venda</th>
                    <th className="py-3 px-4 text-right">Valor em Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {(reportData.stocks || []).map((st: any) => (
                    <tr key={st.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-semibold text-white">{st.location.name}</td>
                      <td className="py-2.5 px-4 text-slate-400">{st.location.city}</td>
                      <td className="py-2.5 px-4 font-medium">{st.productName}</td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400">{st.sku || "-"}</td>
                      <td className="py-2.5 px-4 text-center font-bold text-emerald-400">
                        {st.quantityAvailable} un
                      </td>
                      <td className="py-2.5 px-4 text-center">{st.quantitySold}</td>
                      <td className="py-2.5 px-4 text-center">{st.quantityReturned}</td>
                      <td className="py-2.5 px-4 text-right text-slate-300">
                        R$ {Number(st.sellingPrice).toFixed(2)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-cyan-300">
                        R$ {(st.quantityAvailable * Number(st.sellingPrice)).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
