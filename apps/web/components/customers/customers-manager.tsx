"use client";

import { useState } from "react";
import type { CustomerRecord } from "@/lib/server-customers";

export function CustomersManager({ initialCustomers, initialError }: { initialCustomers: CustomerRecord[]; initialError: string }) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function createCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, ...(document && { document }), ...(email && { email }), ...(phone && { phone }) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar o cliente.");
      setCustomers((items) => [...items, result.data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setName(""); setDocument(""); setEmail(""); setPhone("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao cadastrar cliente."); }
    finally { setSaving(false); }
  }

  async function removeCustomer(customer: CustomerRecord) {
    if (customer._count?.orders) { setError("Este cliente possui pedidos e foi mantido no histórico."); return; }
    if (!window.confirm(`Remover o cliente ${customer.name}?`)) return;
    const response = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível remover o cliente."); return; }
    setCustomers((items) => items.filter((item) => item.id !== customer.id));
  }

  return <div className="space-y-8">
    <header><h2 className="text-2xl font-bold tracking-tight">Clientes</h2><p className="text-muted-foreground">Mantenha seus contatos organizados e associe-os aos pedidos.</p></header>
    <section className="rounded-xl border bg-background p-6 shadow-sm"><h3 className="mb-4 font-semibold">Cadastrar cliente</h3><form onSubmit={createCustomer} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <label className="grid gap-1 text-sm">Nome *<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">Documento<input maxLength={30} value={document} onChange={(event) => setDocument(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">E-mail<input type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
      <label className="grid gap-1 text-sm">Telefone<input maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
      <div className="md:col-span-2 xl:col-span-4"><button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Adicionar cliente"}</button></div>
    </form></section>
    {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="rounded-xl border bg-background shadow-sm"><div className="flex items-center justify-between border-b p-5"><h3 className="font-semibold">Carteira de clientes</h3><span className="text-sm text-muted-foreground">{customers.length} clientes</span></div>
      {customers.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum cliente cadastrado.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Cliente</th><th className="px-5 py-3 font-medium">Documento</th><th className="px-5 py-3 font-medium">Contato</th><th className="px-5 py-3 font-medium">Pedidos</th><th className="px-5 py-3 font-medium">Ações</th></tr></thead><tbody className="divide-y">{customers.map((customer) => <tr key={customer.id}><td className="px-5 py-4 font-medium">{customer.name}</td><td className="px-5 py-4">{customer.document || "—"}</td><td className="px-5 py-4">{[customer.email, customer.phone].filter(Boolean).join(" · ") || "—"}</td><td className="px-5 py-4">{customer._count?.orders ?? 0}</td><td className="px-5 py-4"><button onClick={() => void removeCustomer(customer)} className="text-destructive hover:underline">Remover</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
