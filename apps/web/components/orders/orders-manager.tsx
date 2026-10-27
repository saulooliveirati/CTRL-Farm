"use client";

import Link from "next/link";
import { useState } from "react";
import type { CustomerRecord } from "@/lib/server-customers";
import type { OrderRecord } from "@/lib/server-orders";
import { QuotePrintModal } from "./quote-print-modal";
import { Printer } from "lucide-react";

const labels: Record<OrderRecord["status"], string> = {
  DRAFT: "Novo",
  IN_PRODUCTION: "Em produção",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type ItemDraft = {
  description: string;
  quantity: string;
  unitPrice: string;
  notes: string;
};

export function OrdersManager({
  initialCustomers,
  initialOrders,
  initialError,
}: {
  initialCustomers: CustomerRecord[];
  initialOrders: OrderRecord[];
  initialError: string;
}) {
  const [customers] = useState(initialCustomers);
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState(initialCustomers[0]?.id ?? "");
  const [dueAt, setDueAt] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([
    { description: "", quantity: "1", unitPrice: "", notes: "" },
  ]);
  const [viewingItemsOrder, setViewingItemsOrder] = useState<OrderRecord | null>(null);
  const [printingOrder, setPrintingOrder] = useState<OrderRecord | null>(null);

  const grandTotal = items.reduce((sum, item) => {
    const q = Number(item.quantity) || 0;
    const p = Number(item.unitPrice) || 0;
    return sum + q * p;
  }, 0);
  const totalPieces = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  function addItemRow() {
    setItems((current) => [
      ...current,
      { description: "", quantity: "1", unitPrice: "", notes: "" },
    ]);
  }

  function removeItemRow(index: number) {
    if (items.length <= 1) return;
    setItems((current) => current.filter((_, i) => i !== index));
  }

  function updateItemRow(index: number, field: keyof ItemDraft, value: string) {
    setItems((current) =>
      current.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  }

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (items.some((item) => !item.description.trim() || Number(item.unitPrice) < 0)) {
      setError("Preencha a descrição e valor unitário de todos os itens.");
      return;
    }
    setSaving(true);
    setError("");

    const primaryDescription =
      items.length === 1
        ? items[0].description.trim()
        : `${items[0].description.trim()} (+${items.length - 1} ${items.length === 2 ? "outro item" : "outros itens"})`;

    const mappedItems = items.map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      notes: item.notes.trim() || undefined,
    }));

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          description: primaryDescription,
          quantity: totalPieces,
          unitPrice:
            items.length === 1 ? Number(items[0].unitPrice) : grandTotal / (totalPieces || 1),
          ...(dueAt && { dueAt }),
          ...(orderNotes.trim() && { notes: orderNotes.trim() }),
          items: mappedItems,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar o pedido.");
      setOrders((current) => [result.data, ...current]);
      setItems([{ description: "", quantity: "1", unitPrice: "", notes: "" }]);
      setDueAt("");
      setOrderNotes("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao cadastrar pedido.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(order: OrderRecord) {
    if (!window.confirm(`Cancelar o pedido “${order.description}”?`)) return;
    const response = await fetch(`/api/orders/${order.id}/cancel`, { method: "PATCH" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "Não foi possível cancelar o pedido.");
      return;
    }
    setOrders((items) => items.map((item) => (item.id === order.id ? result.data : item)));
  }

  async function deleteOrder(order: OrderRecord) {
    if (!window.confirm(`Excluir o pedido “${order.description}”?`)) return;
    const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "Não foi possível excluir o pedido.");
      return;
    }
    setOrders((items) => items.filter((item) => item.id !== order.id));
    setError("");
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">Orçamentos</h2>
        <p className="text-muted-foreground">
          Crie propostas comerciais timbradas para impressão e acompanhe orçamentos e pedidos em
          produção.
        </p>
      </header>
      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Novo Orçamento / Pedido</h3>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre um cliente antes de criar pedidos.{" "}
            <Link href="/customers" className="text-primary hover:underline">
              Abrir clientes
            </Link>
          </p>
        ) : (
          <form onSubmit={createOrder} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium">
                Cliente *
                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {customers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-medium">
                Prazo de entrega
                <input
                  type="date"
                  value={dueAt}
                  onChange={(event) => setDueAt(event.target.value)}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>

            {/* Lista de Itens do Pedido */}
            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Itens do pedido ({items.length})</span>
                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  ＋ Adicionar outro item
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => {
                  const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                  return (
                    <div
                      key={`item-${index}`}
                      className="grid items-end gap-2 rounded-md border bg-background p-3 sm:grid-cols-12"
                    >
                      <label className="grid gap-1 text-xs sm:col-span-5">
                        Produto / Peça *
                        <input
                          required
                          value={item.description}
                          onChange={(e) => updateItemRow(index, "description", e.target.value)}
                          placeholder="Ex.: Suporte de parede articulado"
                          className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
                        />
                      </label>

                      <label className="grid gap-1 text-xs sm:col-span-2">
                        Qtd *
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItemRow(index, "quantity", e.target.value)}
                          className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
                        />
                      </label>

                      <label className="grid gap-1 text-xs sm:col-span-2">
                        Valor Un. (R$) *
                        <input
                          required
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItemRow(index, "unitPrice", e.target.value)}
                          placeholder="0,00"
                          className="rounded-md border bg-background px-2.5 py-1.5 text-sm"
                        />
                      </label>

                      <div className="grid gap-1 text-xs sm:col-span-2">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="py-1.5 font-semibold text-sm">
                          {money.format(subtotal)}
                        </span>
                      </div>

                      <div className="flex justify-end sm:col-span-1">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            aria-label="Remover item"
                            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totalizador */}
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">
                  Total de peças: <strong className="text-foreground">{totalPieces}</strong>
                </span>
                <span className="text-base font-bold text-foreground">
                  Valor total: <span className="text-primary">{money.format(grandTotal)}</span>
                </span>
              </div>
            </div>

            <label className="grid gap-1 text-xs font-medium text-muted-foreground">
              Observações gerais do pedido
              <input
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Ex.: Embalagem reforçada para envio Sedex"
                className="rounded-md border bg-background px-3 py-1.5 text-sm text-foreground"
              />
            </label>

            <div>
              <button
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Cadastrar pedido"}
              </button>
            </div>
          </form>
        )}
      </section>
      {error && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <section className="rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b p-5">
          <h3 className="font-semibold">Orçamentos cadastrados</h3>
          <span className="text-sm text-muted-foreground">{orders.length} orçamentos</span>
        </div>
        {orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhum orçamento cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Orçamento</th>
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Quantidade</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Proposta Comercial</th>
                  <th className="px-5 py-3 font-medium">Produção</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map((order) => {
                  const effectiveTotal = order.totalAmount
                    ? Number(order.totalAmount)
                    : Number(order.unitPrice) * order.quantity;

                  return (
                    <tr key={order.id}>
                      <td className="px-5 py-4 font-medium">
                        <div className="flex items-center gap-2">
                          <span>{order.description}</span>
                          {order.items && order.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setViewingItemsOrder(order)}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary hover:bg-primary/20"
                            >
                              {order.items.length} itens
                            </button>
                          )}
                        </div>
                        {order.dueAt && (
                          <div className="text-xs text-muted-foreground">
                            Prazo:{" "}
                            {new Date(order.dueAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">{order.customer.name}</td>
                      <td className="px-5 py-4">{order.quantity}</td>
                      <td className="px-5 py-4">{money.format(effectiveTotal)}</td>
                      <td className="px-5 py-4">
                        {order.productionJob?.status === "QUEUED"
                          ? "Na fila"
                          : labels[order.status]}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setPrintingOrder(order)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 hover:text-cyan-300 transition-colors shadow-sm"
                          title="Visualizar proposta comercial e imprimir"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          <span>Visualizar / Imprimir</span>
                        </button>
                      </td>
                      <td className="space-x-3 px-5 py-4">
                        {order.productionJobs && order.productionJobs.length > 0 ? (
                          <div className="inline-flex items-center gap-2">
                            <Link href="/production" className="text-primary hover:underline">
                              {order.productionJobs.length === 1
                                ? "1 ordem vinculada"
                                : `${order.productionJobs.length} ordens vinculadas`}
                            </Link>
                            {order.status !== "COMPLETED" && order.status !== "CANCELLED" && (
                              <Link
                                href={`/production?order=${order.id}`}
                                className="text-xs text-muted-foreground hover:text-primary hover:underline"
                              >
                                + Nova ordem
                              </Link>
                            )}
                          </div>
                        ) : order.productionJob ? (
                          <Link href="/production" className="text-primary hover:underline">
                            {order.productionJob.status === "COMPLETED"
                              ? "Concluída"
                              : order.productionJob.status === "CANCELLED"
                                ? "Cancelada"
                                : "Ver ordem"}
                          </Link>
                        ) : (
                          order.status === "DRAFT" && (
                            <>
                              <Link
                                href={`/production?order=${order.id}`}
                                className="text-primary hover:underline"
                              >
                                Enviar à produção
                              </Link>
                              <button
                                onClick={() => void cancelOrder(order)}
                                className="text-muted-foreground hover:underline"
                              >
                                Cancelar
                              </button>
                            </>
                          )
                        )}
                        {!order.productionJob &&
                          (!order.productionJobs || order.productionJobs.length === 0) && (
                            <button
                              onClick={() => void deleteOrder(order)}
                              className="text-destructive hover:underline"
                            >
                              Excluir
                            </button>
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de Detalhes dos Itens do Pedido */}
      {viewingItemsOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewingItemsOrder(null);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Itens do Pedido</h3>
                <p className="text-xs text-muted-foreground">
                  Cliente: {viewingItemsOrder.customer.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingItemsOrder(null)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <table className="w-full text-left text-sm">
                <thead className="border-b text-xs text-muted-foreground">
                  <tr>
                    <th className="py-2">Item</th>
                    <th className="py-2 text-right">Qtd</th>
                    <th className="py-2 text-right">Unitário</th>
                    <th className="py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {(viewingItemsOrder.items ?? []).map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 font-medium">
                        {item.description}
                        {item.notes && (
                          <div className="text-[10px] text-muted-foreground">{item.notes}</div>
                        )}
                      </td>
                      <td className="py-2 text-right">{item.quantity}</td>
                      <td className="py-2 text-right">{money.format(Number(item.unitPrice))}</td>
                      <td className="py-2 text-right font-medium">
                        {money.format(item.quantity * Number(item.unitPrice))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between border-t pt-3 font-semibold text-sm">
                <span>Total</span>
                <span>
                  {money.format(
                    viewingItemsOrder.totalAmount
                      ? Number(viewingItemsOrder.totalAmount)
                      : Number(viewingItemsOrder.unitPrice) * viewingItemsOrder.quantity,
                  )}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingItemsOrder(null)}
                className="rounded-md bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Impressão / Visualização da Proposta Comercial */}
      {printingOrder && (
        <QuotePrintModal order={printingOrder} onClose={() => setPrintingOrder(null)} />
      )}
    </div>
  );
}
