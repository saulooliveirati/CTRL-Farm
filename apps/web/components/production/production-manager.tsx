"use client";

import { useState } from "react";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { PrinterRecord } from "@/lib/server-printers";
import type { ProductionRecord } from "@/lib/server-production";
import type { OrderRecord } from "@/lib/server-orders";

type Status = ProductionRecord["status"];
const labels: Record<Status, string> = { QUEUED: "Na fila", PRINTING: "Imprimindo", PAUSED: "Pausada", COMPLETED: "Concluída", FAILED: "Falhou", CANCELLED: "Cancelada" };

export function ProductionManager({ initialPrinters, initialFilaments, initialJobs, initialOrders, initialOrderId, initialError }: {
  initialPrinters: PrinterRecord[]; initialFilaments: FilamentRecord[]; initialJobs: ProductionRecord[]; initialOrders: OrderRecord[]; initialOrderId: string; initialError: string;
}) {
  const [printers] = useState(initialPrinters);
  const [filaments, setFilaments] = useState(initialFilaments);
  const [jobs, setJobs] = useState(initialJobs);
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [printerId, setPrinterId] = useState(initialPrinters[0]?.id ?? "");
  const [filamentId, setFilamentId] = useState(initialFilaments[0]?.id ?? "");
  const [weight, setWeight] = useState("50");
  const [orderId, setOrderId] = useState(initialOrderId);

  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch("/api/production", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, printerId, filamentId, plannedWeightG: Number(weight), ...(orderId && { orderId }) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível criar a ordem.");
      setJobs((items) => [result.data, ...items]); setName("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao criar ordem."); }
    finally { setSaving(false); }
  }

  async function changeStatus(job: ProductionRecord, status: Status) {
    let actualWeightG: number | undefined;
    if (status === "COMPLETED") {
      const answer = window.prompt("Consumo real de filamento em gramas:", String(job.plannedWeightG));
      if (answer === null) return;
      actualWeightG = Number(answer);
      if (!Number.isInteger(actualWeightG) || actualWeightG < 0) { setError("Informe um consumo em gramas válido."); return; }
    }
    const response = await fetch(`/api/production/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, ...(actualWeightG !== undefined && { actualWeightG }) }) });
    const result = await response.json();
    if (!response.ok) { setError(result.message ?? "Não foi possível atualizar a ordem."); return; }
    setJobs((items) => items.map((item) => item.id === job.id ? result.data : item));
    setError("");
    if (status === "COMPLETED") {
      setFilaments((items) => items.map((item) => item.id === result.data.filamentId ? { ...item, currentWeightG: Math.max(0, item.currentWeightG - (result.data.actualWeightG ?? 0)) } : item));
    }
    if (job.orderId && status === "PRINTING") setOrders((items) => items.map((item) => item.id === job.orderId ? { ...item, status: "IN_PRODUCTION" } : item));
    if (job.orderId && status === "COMPLETED") setOrders((items) => items.map((item) => item.id === job.orderId ? { ...item, status: "COMPLETED" } : item));
    if (job.orderId && status === "CANCELLED") setOrders((items) => items.map((item) => item.id === job.orderId ? { ...item, status: "CANCELLED" } : item));
  }

  const availableFilament = filaments.find((item) => item.id === filamentId);

  return (
    <div className="space-y-8">
      <header><h2 className="text-2xl font-bold tracking-tight">Produção</h2><p className="text-muted-foreground">Crie ordens, acompanhe o andamento e registre o consumo real do material.</p></header>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Nova ordem de produção</h3>
        {printers.length === 0 || filaments.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre ao menos uma impressora e uma bobina antes de criar uma ordem.</p> : <form onSubmit={createJob} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm">Identificação *<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="rounded-md border bg-background px-3 py-2" placeholder="Ex.: Suporte de parede" /></label>
          <label className="grid gap-1 text-sm">Impressora *<select value={printerId} onChange={(event) => setPrinterId(event.target.value)} className="rounded-md border bg-background px-3 py-2">{printers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="grid gap-1 text-sm">Bobina *<select value={filamentId} onChange={(event) => setFilamentId(event.target.value)} className="rounded-md border bg-background px-3 py-2">{filaments.map((item) => <option key={item.id} value={item.id}>{item.material} · {item.brand} · {item.color} ({item.currentWeightG} g)</option>)}</select></label>
          <label className="grid gap-1 text-sm">Consumo estimado (g) *<input required type="number" min="1" step="1" max={availableFilament?.currentWeightG} value={weight} onChange={(event) => setWeight(event.target.value)} className="rounded-md border bg-background px-3 py-2" /></label>
          <label className="grid gap-1 text-sm">Pedido associado<select value={orderId} onChange={(event) => setOrderId(event.target.value)} className="rounded-md border bg-background px-3 py-2"><option value="">Sem pedido</option>{orders.filter((item) => item.status === "DRAFT" && !item.productionJob).map((item) => <option key={item.id} value={item.id}>{item.description} · {item.customer.name}</option>)}</select></label>
          <div className="md:col-span-2 xl:col-span-4"><button disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Salvando…" : "Adicionar à fila"}</button></div>
        </form>}
      </section>

      {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="rounded-xl border bg-background shadow-sm">
        <div className="flex items-center justify-between border-b p-5"><h3 className="font-semibold">Ordens de produção</h3><span className="text-sm text-muted-foreground">{jobs.length} ordens</span></div>
        {jobs.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">Nenhuma ordem cadastrada.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-muted/50 text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Ordem</th><th className="px-5 py-3 font-medium">Pedido</th><th className="px-5 py-3 font-medium">Impressora</th><th className="px-5 py-3 font-medium">Material</th><th className="px-5 py-3 font-medium">Estimativa</th><th className="px-5 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium">Ações</th></tr></thead><tbody className="divide-y">{jobs.map((job) => <tr key={job.id}><td className="px-5 py-4 font-medium">{job.name}</td><td className="px-5 py-4">{job.order?.description ?? "—"}</td><td className="px-5 py-4">{job.printer.name}</td><td className="px-5 py-4">{job.filament.material} · {job.filament.brand} · {job.filament.color}</td><td className="px-5 py-4">{job.plannedWeightG} g{job.actualWeightG !== null ? ` · real ${job.actualWeightG} g` : ""}</td><td className="px-5 py-4">{labels[job.status]}</td><td className="space-x-3 px-5 py-4">{job.status === "QUEUED" && <><button onClick={() => void changeStatus(job, "PRINTING")} className="text-primary hover:underline">Iniciar</button><button onClick={() => void changeStatus(job, "CANCELLED")} className="text-muted-foreground hover:underline">Cancelar</button></>}{job.status === "PRINTING" && <><button onClick={() => void changeStatus(job, "PAUSED")} className="text-primary hover:underline">Pausar</button><button onClick={() => void changeStatus(job, "COMPLETED")} className="text-primary hover:underline">Concluir</button><button onClick={() => void changeStatus(job, "FAILED")} className="text-destructive hover:underline">Falhou</button></>}{job.status === "PAUSED" && <><button onClick={() => void changeStatus(job, "PRINTING")} className="text-primary hover:underline">Retomar</button><button onClick={() => void changeStatus(job, "COMPLETED")} className="text-primary hover:underline">Concluir</button></>}{job.status === "FAILED" && <button onClick={() => void changeStatus(job, "PRINTING")} className="text-primary hover:underline">Tentar novamente</button>}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
