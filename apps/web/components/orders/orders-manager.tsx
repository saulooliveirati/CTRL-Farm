"use client";

import Link from "next/link";
import { useState } from "react";
import type { CustomerRecord } from "@/lib/server-customers";
import type { OrderRecord } from "@/lib/server-orders";

const labels: Record<OrderRecord["status"], string> = { DRAFT: "Novo", IN_PRODUCTION: "Em produção", COMPLETED: "Concluído", CANCELLED: "Cancelado" };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function OrdersManager({ initialCustomers, initialOrders, initialError }: { initialCustomers: CustomerRecord[]; initialOrders: OrderRecord[]; initialError: string }) {
  const [customers] = useState(initialCustomers);
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [customerId, setCustomerId] = useState(initialCustomers[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [dueAt, setDueAt] = useState("");

  async function createOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId, description, quantity: Number(quantity), unitPrice: Number(unitPrice), ...(dueAt && { dueAt }) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar o pedido.");
      setOrders((items) => [result.data, ...items]); setDescription(""); setQuantity("1"); setUnitPrice(""); setDueAt("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao cadastrar pedido."); }
    finally { setSaving(false); }
  }

  async function cancelOrder(order: OrderRecord) {
    if (!window.confirm(`Cancelar o pedido “${order.description}”?`)) return;
    const response = await fetch(`/api/orders/${order.id}/cancel`, { method: "PATCH" });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível cancelar o pedido."); return; }
    setOrders((items) => items.map((item) => item.id === order.id ? result.data : item));
  }

  async function deleteOrder(order: OrderRecord) {
    if (!window.confirm(`Excluir o pedido “${order.description}”?`)) return;
    const response = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível excluir o pedido."); return; }
    setOrders((items) => items.filter((item) => item.id !== order.id));
    setError("");
  }

  return <div className="space-y-8">
    <header><h2 className="text-2xl font-bold tracking-tight">Pedidos</h2><p className="text-muted-foreground">Registre solicitações de clientes e acompanhe sua execução na produção.</p></header>
    <section className="rounded-xl border bg-background p-6 shadow-sm"><h3 className="mb-4 font-semibold">Novo pedido</h3>
      {customers.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre um cliente antes de criar pedidos. <Link href="/customers" className="text-primary hover:underline">Abrir clientes</Link></p> : <form onSubmit={createOrder} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="grid gap-1 text-sm">Cliente *<select value={customerId} onChange={(event) => setCustomerId(event.target.value)} className="rounded-md border bg-background px-3 py-2">{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1 text-sm">Produto/descrição *<input required minLength={2} maxLength={160} value={description} onChange={(event) => setDescription(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: Suporte personalizado" /></label>
        <label className="grid gap-1 text-sm">Quantidade *<input required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Valor unitário (R$) *<input required type="number" min="0" step="0.01" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Prazo<input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <div className="md:col-span-2 xl:col-span-5"><button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Cadastrar pedido"}</button></div>
      </form>}
    </section>
    {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="rounded-xl border bg-background shadow-sm"><div className="flex items-center justify-between border-b p-5"><h3 className="font-semibold">Pedidos cadastrados</h3><span className="text-sm text-muted-foreground">{orders.length} pedidos</span></div>
      {orders.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum pedido cadastrado.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Pedido</th><th className="px-5 py-3 font-medium">Cliente</th><th className="px-5 py-3 font-medium">Quantidade</th><th className="px-5 py-3 font-medium">Total</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Produção</th></tr></thead><tbody className="divide-y">{orders.map((order) => <tr key={order.id}><td className="px-5 py-4 font-medium">{order.description}{order.dueAt && <div className="text-xs text-muted-foreground">Prazo: {new Date(order.dueAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>}</td><td className="px-5 py-4">{order.customer.name}</td><td className="px-5 py-4">{order.quantity}</td><td className="px-5 py-4">{money.format(Number(order.unitPrice) * order.quantity)}</td><td className="px-5 py-4">{order.productionJob?.status === "QUEUED" ? "Na fila" : labels[order.status]}</td><td className="space-x-3 px-5 py-4">{order.productionJob ? <Link href="/production" className="text-primary hover:underline">{order.productionJob.status === "COMPLETED" ? "Concluída" : order.productionJob.status === "CANCELLED" ? "Cancelada" : "Ver ordem"}</Link> : order.status === "DRAFT" && <><Link href={`/production?order=${order.id}`} className="text-primary hover:underline">Enviar à produção</Link><button onClick={() => void cancelOrder(order)} className="text-muted-foreground hover:underline">Cancelar</button></>}{!order.productionJob && <button onClick={() => void deleteOrder(order)} className="text-destructive hover:underline">Excluir</button>}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
