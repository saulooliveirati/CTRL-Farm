"use client";

import { useCallback, useState } from "react";
import type { PrinterRecord } from "@/lib/server-printers";
import type { SupplierRecord } from "@/lib/server-suppliers";

type PrinterStatus = "READY" | "PRINTING" | "PAUSED" | "ERROR" | "MAINTENANCE" | "OFFLINE";
type Printer = PrinterRecord;

const statuses: { value: PrinterStatus; label: string }[] = [
  { value: "READY", label: "Pronta" }, { value: "PRINTING", label: "Imprimindo" },
  { value: "PAUSED", label: "Pausada" }, { value: "ERROR", label: "Com erro" },
  { value: "MAINTENANCE", label: "Manutenção" }, { value: "OFFLINE", label: "Desligada" },
];

export function PrintersManager({ initialPrinters, initialSuppliers, initialError }: { initialPrinters: Printer[]; initialSuppliers: SupplierRecord[]; initialError: string }) {
  const [printers, setPrinters] = useState<Printer[]>(initialPrinters);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError);
  const [name, setName] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [location, setLocation] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const loadPrinters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/printers", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível carregar as impressoras.");
      setPrinters(result.data ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao carregar impressoras.");
    } finally { setLoading(false); }
  }, []);

  async function createPrinter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/printers", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, manufacturer, model, location, ...(supplierId && { supplierId }) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível cadastrar.");
      setName(""); setManufacturer(""); setModel(""); setLocation(""); setSupplierId("");
      await loadPrinters();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao cadastrar."); }
    finally { setSaving(false); }
  }

  async function updateStatus(printer: Printer, status: PrinterStatus) {
    const response = await fetch(`/api/printers/${printer.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível atualizar o status."); return; }
    setPrinters((current) => current.map((item) => item.id === printer.id ? result.data : item));
  }

  async function removePrinter(printer: Printer) {
    if (!window.confirm(`Remover a impressora “${printer.name}”?`)) return;
    const response = await fetch(`/api/printers/${printer.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível remover."); return; }
    setPrinters((current) => current.filter((item) => item.id !== printer.id));
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">Impressoras</h2>
        <p className="text-muted-foreground">Cadastre e acompanhe os equipamentos da sua fazenda.</p>
      </header>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Cadastrar impressora</h3>
        <form onSubmit={createPrinter} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm">Nome *<input required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: Bambu X1 Carbon" /></label>
          <label className="grid gap-1 text-sm">Fabricante<input maxLength={80} value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: Bambu Lab" /></label>
          <label className="grid gap-1 text-sm">Modelo<input maxLength={80} value={model} onChange={(event) => setModel(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: X1 Carbon" /></label>
          <label className="grid gap-1 text-sm">Localização<input maxLength={100} value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: Bancada 1" /></label>
          <label className="grid gap-1 text-sm">Fornecedor<select value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="rounded-md border bg-background px-3 py-2"><option value="">Não informado</option>{initialSuppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <div className="md:col-span-2 xl:col-span-4"><button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Adicionar impressora"}</button></div>
        </form>
      </section>

      {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b p-5"><h3 className="font-semibold">Equipamentos cadastrados</h3><span className="text-sm text-muted-foreground">{printers.length} {printers.length === 1 ? "impressora" : "impressoras"}</span></div>
        {loading ? <p className="p-6 text-sm text-muted-foreground">Carregando…</p> : printers.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma impressora cadastrada.</div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Impressora</th><th className="px-5 py-3 font-medium">Localização</th><th className="px-5 py-3 font-medium">Fornecedor</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Ações</th></tr></thead>
            <tbody className="divide-y">{printers.map((printer) => <tr key={printer.id}><td className="px-5 py-4"><div className="font-medium">{printer.name}</div><div className="text-xs text-muted-foreground">{[printer.manufacturer, printer.model].filter(Boolean).join(" · ") || "Fabricante/modelo não informados"}</div></td><td className="px-5 py-4">{printer.location || "—"}</td><td className="px-5 py-4">{printer.supplier?.name ?? "—"}</td><td className="px-5 py-4"><select aria-label={`Status de ${printer.name}`} value={printer.status} onChange={(event) => void updateStatus(printer, event.target.value as PrinterStatus)} className="rounded-md border bg-background px-2 py-1">{statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></td><td className="px-5 py-4"><button onClick={() => void removePrinter(printer)} className="text-destructive hover:underline">Remover</button></td></tr>)}</tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
