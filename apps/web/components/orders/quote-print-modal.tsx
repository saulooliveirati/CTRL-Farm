"use client";

import { useEffect, useState } from "react";
import type { OrderRecord } from "@/lib/server-orders";
import type { CompanyRecord } from "@/lib/server-companies";
import { Printer, X, Copy, Check, User, FileText, DollarSign } from "lucide-react";

interface QuotePrintModalProps {
  order: OrderRecord;
  company?: CompanyRecord | null;
  onClose: () => void;
}

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function QuotePrintModal({ order, company, onClose }: QuotePrintModalProps) {
  const [copied, setCopied] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<CompanyRecord | null>(company || null);

  // Load company details if not provided via props
  useEffect(() => {
    if (!companyDetails) {
      fetch("/api/company")
        .then((r) => (r.ok ? r.json() : null))
        .then((json) => {
          if (json?.data) setCompanyDetails(json.data);
        })
        .catch(() => {});
    }
  }, [companyDetails]);

  // Read any extended local storage company info if present
  const [extendedInfo, setExtendedInfo] = useState<{
    pixKey?: string;
    pixKeyType?: string;
    address?: string;
    warrantyTerms?: string;
  }>({});

  useEffect(() => {
    if (typeof window !== "undefined" && companyDetails?.id) {
      try {
        const ext = localStorage.getItem(`ctrlfarm_company_ext_${companyDetails.id}`);
        if (ext) {
          const parsed = JSON.parse(ext);
          setExtendedInfo({
            pixKey: parsed.pixKey,
            pixKeyType: parsed.pixKeyType,
            address: parsed.address,
            warrantyTerms: parsed.notes,
          });
        }
      } catch {
        // Fallback silencioso
      }
    }
  }, [companyDetails?.id]);

  const items =
    order.items && order.items.length > 0
      ? order.items
      : [
          {
            id: "primary",
            description: order.description,
            quantity: order.quantity || 1,
            unitPrice: Number(order.unitPrice) || 0,
            notes: order.notes || null,
          },
        ];

  const totalCalculated = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    0,
  );

  const finalTotal =
    order.totalAmount !== null && order.totalAmount !== undefined && Number(order.totalAmount) > 0
      ? Number(order.totalAmount)
      : totalCalculated;

  const quoteNumber = `ORC-${order.id.slice(0, 8).toUpperCase()}`;
  const emissionDate = new Date().toLocaleDateString("pt-BR");
  const deliveryDate = order.dueAt
    ? new Date(order.dueAt).toLocaleDateString("pt-BR")
    : "A combinar";

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = async () => {
    const lines = [
      `*PROPOSTA COMERCIAL - ${quoteNumber}*`,
      `*Empresa:* ${companyDetails?.tradeName || companyDetails?.name || "CTRL-Farm 3D"}`,
      `*Cliente:* ${order.customer?.name || "Cliente"}`,
      `*Data:* ${emissionDate}`,
      `*Previsão de Entrega:* ${deliveryDate}`,
      "",
      "*ITENS DO ORÇAMENTO:*",
      ...items.map(
        (it, idx) =>
          `${idx + 1}. ${it.description} - ${it.quantity} un x ${moneyFormatter.format(Number(it.unitPrice))} = ${moneyFormatter.format((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0))}`,
      ),
      "",
      `*VALOR TOTAL:* ${moneyFormatter.format(finalTotal)}`,
      extendedInfo.pixKey
        ? `*Chave PIX:* ${extendedInfo.pixKey} (${extendedInfo.pixKeyType || "PIX"})`
        : "",
      "",
      "Agradecemos a preferência!",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      {/* Container Principal */}
      <div className="relative w-full max-w-4xl max-h-[95vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl print:m-0 print:p-0 print:border-none print:shadow-none print:bg-white print:max-h-none print:w-full">
        {/* Barra de Ações Superior (Oculta na Impressão) */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900/95 px-6 py-4 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-white">Visualização de Proposta Comercial</h3>
              <p className="text-[11px] text-slate-400">
                Layout otimizado para impressão A4 e exportação em PDF.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
              title="Copiar resumo para WhatsApp"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? "Copiado!" : "Copiar Texto"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            DOCUMENTO A4 TIMBRADO - Visualização em tela e Impressão física
            ========================================================================= */}
        <div
          id="printable-quote-sheet"
          className="p-6 sm:p-10 bg-white text-slate-900 rounded-b-2xl font-sans print:p-8 print:rounded-none"
        >
          {/* Cabeçalho da Proposta */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between border-b-2 border-slate-900 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-black text-sm tracking-wider">
                  3D
                </span>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase">
                  {companyDetails?.tradeName || companyDetails?.name || "CTRL-Farm Manufatura 3D"}
                </h1>
              </div>
              <p className="mt-1 text-xs font-medium text-slate-600">
                Soluções Especializadas em Impressão 3D & Prototipagem Rápida
              </p>
              {companyDetails?.document && (
                <p className="text-xs text-slate-500">
                  Documento:{" "}
                  <strong className="font-semibold text-slate-700">
                    {companyDetails.document}
                  </strong>
                </p>
              )}
              {companyDetails?.email && (
                <p className="text-xs text-slate-500">
                  Email: {companyDetails.email}{" "}
                  {companyDetails.phone && `• Tel: ${companyDetails.phone}`}
                </p>
              )}
              {extendedInfo.address && (
                <p className="text-xs text-slate-500">Endereço: {extendedInfo.address}</p>
              )}
            </div>

            {/* Caixa do Orçamento */}
            <div className="sm:text-right flex flex-col sm:items-end">
              <span className="inline-block rounded bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-800 border border-slate-200">
                Proposta Comercial
              </span>
              <p className="mt-2 text-xl font-mono font-bold text-slate-900">{quoteNumber}</p>
              <div className="mt-1 text-xs text-slate-500 space-y-0.5">
                <p>
                  Emissão: <strong className="text-slate-800">{emissionDate}</strong>
                </p>
                <p>
                  Prazo Estimado: <strong className="text-slate-800">{deliveryDate}</strong>
                </p>
                <p>
                  Validade: <strong className="text-slate-800">10 dias corridos</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-600" />
              Dados do Destinatário / Cliente
            </h4>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-slate-500">Nome / Razão Social:</p>
                <p className="text-sm font-bold text-slate-900">
                  {order.customer?.name || "Consumidor Final"}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Status do Pedido:</p>
                <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800">
                  {order.status === "COMPLETED"
                    ? "Concluído"
                    : order.status === "IN_PRODUCTION"
                      ? "Em Produção"
                      : order.status === "CANCELLED"
                        ? "Cancelado"
                        : "Proposta / Em Aberto"}
                </span>
              </div>
            </div>
          </div>

          {/* Tabela Discriminada de Itens */}
          <div className="mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-100/80 text-[11px] font-bold uppercase text-slate-700">
                    <th className="py-2.5 px-3">Item</th>
                    <th className="py-2.5 px-3">Descrição / Especificação Técnica</th>
                    <th className="py-2.5 px-3 text-center">Qtd</th>
                    <th className="py-2.5 px-3 text-right">Valor Unitário</th>
                    <th className="py-2.5 px-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((it, idx) => {
                    const q = Number(it.quantity) || 1;
                    const u = Number(it.unitPrice) || 0;
                    const lineTotal = q * u;
                    return (
                      <tr key={it.id || idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-mono font-medium text-slate-500">
                          {String(idx + 1).padStart(2, "0")}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-semibold text-slate-900">{it.description}</p>
                          {it.notes && (
                            <p className="mt-0.5 text-[11px] text-slate-500 italic">
                              Obs: {it.notes}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-slate-800">{q}</td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {moneyFormatter.format(u)}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {moneyFormatter.format(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Resumo Financeiro & Totais */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t-2 border-slate-200">
            {/* Formas de Pagamento e Condições */}
            <div className="w-full sm:max-w-md rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <h5 className="font-bold text-slate-800 flex items-center gap-1.5 mb-2">
                <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                Condições de Pagamento & PIX
              </h5>
              {extendedInfo.pixKey ? (
                <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">
                    Chave PIX ({extendedInfo.pixKeyType || "Oficial"}):
                  </p>
                  <p className="font-mono font-bold text-slate-900 text-xs select-all">
                    {extendedInfo.pixKey}
                  </p>
                </div>
              ) : (
                <p className="text-slate-600">
                  Pagamento via PIX, Transferência Bancária ou Cartão conforme acordado.
                </p>
              )}

              {order.notes && (
                <div className="mt-2 text-slate-600">
                  <p className="text-[10px] uppercase font-semibold text-slate-500">
                    Observações do Pedido:
                  </p>
                  <p className="italic">{order.notes}</p>
                </div>
              )}
            </div>

            {/* Totalizadores */}
            <div className="w-full sm:w-72 rounded-xl bg-slate-900 text-white p-4 shadow-sm">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Itens no Orçamento:</span>
                  <span className="font-semibold text-white">{items.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Peças Totais:</span>
                  <span className="font-semibold text-white">
                    {items.reduce((s, it) => s + (Number(it.quantity) || 1), 0)} un
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-sm font-bold uppercase tracking-wider text-cyan-400">
                    Total Geral:
                  </span>
                  <span className="text-2xl font-black text-white">
                    {moneyFormatter.format(finalTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Termos & Assinaturas */}
          <div className="mt-8 pt-6 border-t border-slate-200 text-[10px] text-slate-500 space-y-2">
            <p>
              <strong>Condições Gerais:</strong> A produção é iniciada após confirmação do pedido ou
              sinal acordado. Pequenas marcas de camadas (layers) e linhas de junção são
              características normais do processo de manufatura aditiva FDM/SLA.
            </p>
            {extendedInfo.warrantyTerms && (
              <p>
                <strong>Termos Adicionais:</strong> {extendedInfo.warrantyTerms}
              </p>
            )}

            <div className="mt-10 grid grid-cols-2 gap-12 pt-8 text-center text-xs">
              <div className="border-t border-slate-300 pt-2">
                <p className="font-semibold text-slate-800">
                  {companyDetails?.tradeName || companyDetails?.name || "CTRL-Farm 3D"}
                </p>
                <p className="text-[10px] text-slate-500">Assinatura do Responsável</p>
              </div>
              <div className="border-t border-slate-300 pt-2">
                <p className="font-semibold text-slate-800">
                  {order.customer?.name || "Cliente / Aceite da Proposta"}
                </p>
                <p className="text-[10px] text-slate-500">De acordo com valores e prazos</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
