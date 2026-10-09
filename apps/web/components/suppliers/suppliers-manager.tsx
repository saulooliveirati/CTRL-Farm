"use client";

import { useState } from "react";
import type { SupplierRecord } from "@/lib/server-suppliers";

export function SuppliersManager({ initialSuppliers, initialError }: { initialSuppliers: SupplierRecord[]; initialError: string }) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  async function createSupplier(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, ...(document && { document }), ...(email && { email }), ...(phone && { phone }), ...(address && { address }) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar o fornecedor.");
      setSuppliers((items) => [...items, result.data].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setName(""); setDocument(""); setEmail(""); setPhone(""); setAddress("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao cadastrar fornecedor."); }
    finally { setSaving(false); }
  }

  async function removeSupplier(supplier: SupplierRecord) {
    if (!window.confirm(`Remover o fornecedor “${supplier.name}”?`)) return;
    const response = await fetch(`/api/suppliers/${supplier.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível remover o fornecedor."); return; }
    setSuppliers((items) => items.filter((item) => item.id !== supplier.id)); setError("");
  }

  return <div className="space-y-8">
    <header><h2 className="text-2xl font-bold tracking-tight">Fornecedores</h2><p className="text-muted-foreground">Cadastre seus fornecedores e vincule-os a impressoras, bobinas e materiais.</p></header>
    <section className="rounded-xl border bg-background p-6 shadow-sm"><h3 className="mb-4 font-semibold">Novo fornecedor</h3>
      <form onSubmit={createSupplier} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="grid gap-1 text-sm">Nome *<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">CNPJ/CPF<input maxLength={30} value={document} onChange={(event) => setDocument(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">E-mail<input type="email" maxLength={160} value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm">Telefone<input maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <label className="grid gap-1 text-sm md:col-span-2">Endereço<input maxLength={240} value={address} onChange={(event) => setAddress(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
        <div className="md:col-span-2 xl:col-span-3"><button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Cadastrar fornecedor"}</button></div>
      </form>
    </section>
    {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <section className="rounded-xl border bg-background shadow-sm"><div className="flex items-center justify-between border-b p-5"><h3 className="font-semibold">Fornecedores cadastrados</h3><span className="text-sm text-muted-foreground">{suppliers.length} fornecedores</span></div>
      {suppliers.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhum fornecedor cadastrado.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[750px] text-left text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Fornecedor</th><th className="px-5 py-3 font-medium">Documento</th><th className="px-5 py-3 font-medium">Contato</th><th className="px-5 py-3 font-medium">Ações</th></tr></thead><tbody className="divide-y">{suppliers.map((supplier) => <tr key={supplier.id}><td className="px-5 py-4 font-medium">{supplier.name}<div className="text-xs text-muted-foreground">{supplier.address ?? ""}</div></td><td className="px-5 py-4">{supplier.document ?? "—"}</td><td className="px-5 py-4">{supplier.email ?? "—"}<div className="text-xs text-muted-foreground">{supplier.phone ?? ""}</div></td><td className="px-5 py-4"><button onClick={() => void removeSupplier(supplier)} className="text-destructive hover:underline">Remover</button></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
