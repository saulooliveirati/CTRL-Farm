"use client";

import { useEffect, useState } from "react";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { PrinterRecord } from "@/lib/server-printers";
import type { ProductionRecord } from "@/lib/server-production";
import type { OrderRecord } from "@/lib/server-orders";

type Status = ProductionRecord["status"];
type AmsSlotDraft = {
  filamentId: string;
  slotNumber: number;
  plannedWeightG: string;
};

const labels: Record<Status, string> = {
  QUEUED: "Na fila",
  PRINTING: "Imprimindo",
  PAUSED: "Pausada",
  COMPLETED: "Concluída",
  FAILED: "Falhou",
  CANCELLED: "Cancelada",
};
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}min ${remainder}s`;
  if (minutes > 0) return `${minutes}min ${remainder}s`;
  return `${remainder}s`;
};

export function ProductionManager({
  initialPrinters,
  initialFilaments,
  initialJobs,
  initialOrders,
  initialOrderId,
  initialError,
}: {
  initialPrinters: PrinterRecord[];
  initialFilaments: FilamentRecord[];
  initialJobs: ProductionRecord[];
  initialOrders: OrderRecord[];
  initialOrderId: string;
  initialError: string;
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
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState("");
  const [orderId, setOrderId] = useState(initialOrderId);
  const [now, setNow] = useState(0);

  const selectedPrinter = printers.find((p) => p.id === printerId);
  const [useAms, setUseAms] = useState(Boolean(initialPrinters[0]?.hasAms));
  const [amsSlots, setAmsSlots] = useState<AmsSlotDraft[]>([
    { filamentId: initialFilaments[0]?.id ?? "", slotNumber: 1, plannedWeightG: "30" },
    {
      filamentId: initialFilaments[1]?.id ?? initialFilaments[0]?.id ?? "",
      slotNumber: 2,
      plannedWeightG: "20",
    },
  ]);

  const totalPlannedWeight = useAms
    ? amsSlots.reduce((sum, s) => sum + (Number(s.plannedWeightG) || 0), 0)
    : Number(weight);

  function addAmsSlot() {
    if (amsSlots.length >= 16) return;
    const nextSlot = amsSlots.length + 1;
    setAmsSlots((current) => [
      ...current,
      { filamentId: filaments[0]?.id ?? "", slotNumber: nextSlot, plannedWeightG: "20" },
    ]);
  }

  function removeAmsSlot(index: number) {
    if (amsSlots.length <= 1) return;
    setAmsSlots((current) =>
      current.filter((_, i) => i !== index).map((slot, i) => ({ ...slot, slotNumber: i + 1 })),
    );
  }

  function updateAmsSlot(index: number, field: keyof AmsSlotDraft, value: string | number) {
    setAmsSlots((current) =>
      current.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
    );
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function createJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const filamentsPayload = useAms
      ? amsSlots.map((s) => ({
          filamentId: s.filamentId,
          slotNumber: s.slotNumber,
          plannedWeightG: Number(s.plannedWeightG) || 1,
        }))
      : undefined;

    try {
      const response = await fetch("/api/production", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          printerId,
          filamentId: useAms ? amsSlots[0]?.filamentId : filamentId,
          plannedWeightG: totalPlannedWeight,
          ...(plannedDurationMinutes && { plannedDurationMinutes: Number(plannedDurationMinutes) }),
          ...(orderId && { orderId }),
          ...(filamentsPayload && { filaments: filamentsPayload }),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível criar a ordem.");
      setJobs((items) => [result.data, ...items]);
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao criar ordem.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(job: ProductionRecord, status: Status) {
    let actualWeightG: number | undefined;
    if (status === "COMPLETED") {
      const answer = window.prompt(
        "Consumo real de filamento em gramas:",
        String(job.plannedWeightG),
      );
      if (answer === null) return;
      actualWeightG = Number(answer);
      if (!Number.isInteger(actualWeightG) || actualWeightG < 0) {
        setError("Informe um consumo em gramas válido.");
        return;
      }
    }
    const response = await fetch(`/api/production/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(actualWeightG !== undefined && { actualWeightG }) }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "Não foi possível atualizar a ordem.");
      return;
    }
    setJobs((items) => items.map((item) => (item.id === job.id ? result.data : item)));
    setError("");
    if (status === "COMPLETED") {
      setFilaments((items) =>
        items.map((item) =>
          item.id === result.data.filamentId
            ? {
                ...item,
                currentWeightG: Math.max(0, item.currentWeightG - (result.data.actualWeightG ?? 0)),
              }
            : item,
        ),
      );
    }
    if (job.orderId && status === "PRINTING")
      setOrders((items) =>
        items.map((item) =>
          item.id === job.orderId ? { ...item, status: "IN_PRODUCTION" } : item,
        ),
      );
    if (job.orderId && status === "COMPLETED")
      setOrders((items) =>
        items.map((item) => (item.id === job.orderId ? { ...item, status: "COMPLETED" } : item)),
      );
    if (job.orderId && status === "CANCELLED")
      setOrders((items) =>
        items.map((item) => (item.id === job.orderId ? { ...item, status: "CANCELLED" } : item)),
      );
  }

  async function deleteJob(job: ProductionRecord) {
    const message =
      job.status === "COMPLETED"
        ? `Retirar “${job.name}” da lista? O histórico e o consumo serão mantidos.`
        : `Excluir a ordem de produção “${job.name}”?`;
    if (!window.confirm(message)) return;
    const response = await fetch(`/api/production/${job.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "Não foi possível excluir a ordem.");
      return;
    }
    setJobs((items) => items.filter((item) => item.id !== job.id));
    setError("");
  }

  async function adjustConsumption(job: ProductionRecord) {
    const answer = window.prompt(
      "Consumo real corrigido de filamento (gramas):",
      String(job.actualWeightG ?? job.plannedWeightG),
    );
    if (answer === null) return;
    const actualWeightG = Number(answer);
    if (!Number.isInteger(actualWeightG) || actualWeightG < 0) {
      setError("Informe um consumo em gramas válido.");
      return;
    }
    const response = await fetch(`/api/production/${job.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actualWeightG }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "Não foi possível corrigir o consumo.");
      return;
    }
    const difference = (job.actualWeightG ?? 0) - actualWeightG;
    setFilaments((items) =>
      items.map((item) =>
        item.id === job.filamentId
          ? { ...item, currentWeightG: item.currentWeightG + difference }
          : item,
      ),
    );
    setJobs((items) => items.map((item) => (item.id === job.id ? result.data : item)));
    setError("");
  }

  const availableFilament = filaments.find((item) => item.id === filamentId);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">Produção</h2>
        <p className="text-muted-foreground">
          Crie ordens, acompanhe o andamento e registre o consumo real do material.
        </p>
      </header>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h3 className="mb-4 font-semibold">Nova ordem de produção</h3>
        {printers.length === 0 || filaments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre ao menos uma impressora e uma bobina antes de criar uma ordem.
          </p>
        ) : (
          <form onSubmit={createJob} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm">
              Identificação *
              <input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-md border bg-background px-3 py-2"
                placeholder="Ex.: Suporte de parede"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Impressora *
              <select
                value={printerId}
                onChange={(event) => {
                  const id = event.target.value;
                  setPrinterId(id);
                  const p = printers.find((item) => item.id === id);
                  if (p?.hasAms) setUseAms(true);
                }}
                className="rounded-md border bg-background px-3 py-2"
              >
                {printers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.hasAms ? "(com AMS)" : ""}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 p-3 md:col-span-2 xl:col-span-4">
              <input
                id="useAmsCheckbox"
                type="checkbox"
                checked={useAms}
                onChange={(e) => setUseAms(e.target.checked)}
                className="h-4 w-4 rounded accent-primary"
              />
              <label htmlFor="useAmsCheckbox" className="cursor-pointer text-sm font-semibold">
                Produção Multicolor / AMS (Múltiplos Filamentos)
                {selectedPrinter?.hasAms && (
                  <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-normal text-violet-400">
                    Suporte AMS nativo nesta impressora
                  </span>
                )}
              </label>
            </div>

            {!useAms ? (
              <>
                <label className="grid gap-1 text-sm">
                  Bobina *
                  <select
                    value={filamentId}
                    onChange={(event) => setFilamentId(event.target.value)}
                    className="rounded-md border bg-background px-3 py-2"
                  >
                    {filaments.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.material} · {item.brand} · {item.color} ({item.currentWeightG} g)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Consumo estimado (g) *
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    max={availableFilament?.currentWeightG}
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    className="rounded-md border bg-background px-3 py-2"
                  />
                </label>
              </>
            ) : (
              <div className="space-y-3 rounded-lg border bg-muted/10 p-4 md:col-span-2 xl:col-span-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">
                    Cores / Slots de Filamento ({amsSlots.length})
                  </span>
                  <button
                    type="button"
                    onClick={addAmsSlot}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    ＋ Adicionar cor / slot
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {amsSlots.map((slot, idx) => (
                    <div
                      key={`slot-${idx}`}
                      className="relative space-y-2 rounded-md border bg-background p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-violet-400">
                          Slot {slot.slotNumber}
                        </span>
                        {amsSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeAmsSlot(idx)}
                            className="text-xs text-muted-foreground hover:text-destructive"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <label className="grid gap-1 text-xs">
                        Bobina
                        <select
                          value={slot.filamentId}
                          onChange={(e) => updateAmsSlot(idx, "filamentId", e.target.value)}
                          className="rounded-md border bg-background px-2 py-1.5 text-xs"
                        >
                          {filaments.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.material} · {f.color} ({f.currentWeightG}g)
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs">
                        Consumo (g)
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          value={slot.plannedWeightG}
                          onChange={(e) => updateAmsSlot(idx, "plannedWeightG", e.target.value)}
                          className="rounded-md border bg-background px-2 py-1.5 text-xs"
                        />
                      </label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between border-t pt-2 text-xs">
                  <span className="text-muted-foreground">Total de material previsto:</span>
                  <strong className="text-foreground">{totalPlannedWeight} g</strong>
                </div>
              </div>
            )}

            <label className="grid gap-1 text-sm">
              Tempo estimado (min)
              <input
                type="number"
                min="1"
                max="43200"
                step="1"
                value={plannedDurationMinutes}
                onChange={(event) => setPlannedDurationMinutes(event.target.value)}
                className="rounded-md border bg-background px-3 py-2"
                placeholder="Ex.: 240"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Pedido associado
              <select
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                className="rounded-md border bg-background px-3 py-2"
              >
                <option value="">Sem pedido</option>
                {orders
                  .filter((item) => item.status === "DRAFT" || item.status === "IN_PRODUCTION")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.description} · {item.customer.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="md:col-span-2 xl:col-span-4">
              <button
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {saving ? "Salvando…" : "Adicionar à fila"}
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
          <h3 className="font-semibold">Ordens de produção</h3>
          <span className="text-sm text-muted-foreground">{jobs.length} ordens</span>
        </div>
        {jobs.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Nenhuma ordem cadastrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Ordem / Pedido</th>
                  <th className="px-5 py-3 font-medium">Equipamento</th>
                  <th className="px-5 py-3 font-medium">Material / consumo</th>
                  <th className="px-5 py-3 font-medium">Tempo previsto / ativo</th>
                  <th className="px-5 py-3 font-medium">Início / conclusão</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => {
                  const elapsedSeconds =
                    job.actualDurationSeconds +
                    (job.activeSince
                      ? Math.max(0, Math.floor((now - new Date(job.activeSince).getTime()) / 1000))
                      : 0);
                  return (
                    <tr key={job.id}>
                      <td className="px-5 py-4 font-medium">
                        {job.name}
                        <div className="text-xs text-muted-foreground">
                          {job.order?.description ?? "Sem pedido"}
                        </div>
                      </td>
                      <td className="px-5 py-4">{job.printer.name}</td>
                      <td className="px-5 py-4">
                        {job.filaments && job.filaments.length > 0 ? (
                          <div className="space-y-1">
                            {job.filaments.map((f, idx) => (
                              <div key={f.id ?? idx} className="flex items-center gap-1.5 text-xs">
                                <span className="rounded bg-violet-500/20 px-1 py-0.5 text-[10px] font-semibold text-violet-400">
                                  Slot {f.slotNumber ?? idx + 1}
                                </span>
                                <span>
                                  {f.filament?.material ?? "Material"} · {f.filament?.color ?? ""} (
                                  {f.plannedWeightG}g)
                                </span>
                              </div>
                            ))}
                            <div className="text-[11px] text-muted-foreground">
                              Total: {job.plannedWeightG} g
                              {job.actualWeightG !== null ? ` · Real ${job.actualWeightG} g` : ""}
                            </div>
                          </div>
                        ) : (
                          <>
                            {job.filament.material} · {job.filament.brand} · {job.filament.color}
                            <div className="text-xs text-muted-foreground">
                              Estimado {job.plannedWeightG} g
                              {job.actualWeightG !== null ? ` · Real ${job.actualWeightG} g` : ""}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        Previsto{" "}
                        {job.plannedDurationMinutes
                          ? formatDuration(job.plannedDurationMinutes * 60)
                          : "—"}
                        <div className="text-xs text-muted-foreground">
                          Ativo {formatDuration(elapsedSeconds)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {job.startedAt
                          ? new Date(job.startedAt).toLocaleString("pt-BR", {
                              timeZone: "America/Sao_Paulo",
                            })
                          : "Ainda não iniciada"}
                        <div className="text-muted-foreground">
                          {job.completedAt
                            ? new Date(job.completedAt).toLocaleString("pt-BR", {
                                timeZone: "America/Sao_Paulo",
                              })
                            : "Em andamento"}
                        </div>
                      </td>
                      <td className="px-5 py-4">{labels[job.status]}</td>
                      <td className="space-x-3 px-5 py-4">
                        {job.status === "QUEUED" && (
                          <>
                            <button
                              onClick={() => void changeStatus(job, "PRINTING")}
                              className="text-primary hover:underline"
                            >
                              Iniciar
                            </button>
                            <button
                              onClick={() => void changeStatus(job, "CANCELLED")}
                              className="text-muted-foreground hover:underline"
                            >
                              Cancelar
                            </button>
                          </>
                        )}
                        {job.status === "PRINTING" && (
                          <>
                            <button
                              onClick={() => void changeStatus(job, "PAUSED")}
                              className="text-primary hover:underline"
                            >
                              Pausar
                            </button>
                            <button
                              onClick={() => void changeStatus(job, "CANCELLED")}
                              className="text-destructive hover:underline"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => void changeStatus(job, "COMPLETED")}
                              className="text-primary hover:underline"
                            >
                              Concluir
                            </button>
                            <button
                              onClick={() => void changeStatus(job, "FAILED")}
                              className="text-destructive hover:underline"
                            >
                              Falhou
                            </button>
                          </>
                        )}
                        {job.status === "PAUSED" && (
                          <>
                            <button
                              onClick={() => void changeStatus(job, "PRINTING")}
                              className="text-primary hover:underline"
                            >
                              Retomar
                            </button>
                            <button
                              onClick={() => void changeStatus(job, "CANCELLED")}
                              className="text-muted-foreground hover:underline"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => void changeStatus(job, "COMPLETED")}
                              className="text-primary hover:underline"
                            >
                              Concluir
                            </button>
                          </>
                        )}
                        {job.status === "FAILED" && (
                          <button
                            onClick={() => void changeStatus(job, "PRINTING")}
                            className="text-primary hover:underline"
                          >
                            Tentar novamente
                          </button>
                        )}
                        {job.status === "COMPLETED" && (
                          <>
                            <button
                              onClick={() => void adjustConsumption(job)}
                              className="text-primary hover:underline"
                            >
                              Corrigir consumo
                            </button>
                            <button
                              onClick={() => void deleteJob(job)}
                              className="text-destructive hover:underline"
                            >
                              Retirar da lista
                            </button>
                          </>
                        )}
                        {(job.status === "QUEUED" || job.status === "CANCELLED") &&
                          !job.startedAt &&
                          job.actualWeightG === null && (
                            <button
                              onClick={() => void deleteJob(job)}
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
    </div>
  );
}
