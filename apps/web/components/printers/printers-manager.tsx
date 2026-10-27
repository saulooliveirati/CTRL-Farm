"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { CameraRecord } from "@/lib/server-cameras";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { PrinterRecord } from "@/lib/server-printers";
import type { ProductionRecord } from "@/lib/server-production";
import type { SupplierRecord } from "@/lib/server-suppliers";
import { Printer3DIcon } from "@/components/icons/printer-3d-icon";
import { SupplierQuickCreate } from "@/components/suppliers/supplier-quick-create";
import { DeviceControlModal } from "./device-control-modal";
import { detectBrandSlicer } from "./slicer-brands";
import { PrinterWikiTab } from "./printer-wiki-tab";
import {
  getAllWikiBrands,
  getWikiModelsByBrand,
  findWikiModel,
} from "@/lib/equipment-wiki-database";

type PrinterStatus = PrinterRecord["status"];
type ConfigTabType = "general" | "telemetry" | "wiki";
type PrinterDraft = {
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  notes: string;
  supplierId: string;
  status: PrinterStatus;
  nozzleMm: string;
  extruderCount: string;
  usageHours: string;
  imageUrl: string;
  hasAms: boolean;
};

const statuses: { value: PrinterStatus; label: string; color: string }[] = [
  { value: "READY", label: "Disponível", color: "bg-emerald-100 text-emerald-800" },
  { value: "PRINTING", label: "Imprimindo", color: "bg-blue-100 text-blue-800" },
  { value: "PAUSED", label: "Pausada", color: "bg-amber-100 text-amber-800" },
  { value: "ERROR", label: "Com erro", color: "bg-rose-100 text-rose-800" },
  { value: "MAINTENANCE", label: "Manutenção", color: "bg-violet-100 text-violet-800" },
  { value: "OFFLINE", label: "Desligada", color: "bg-slate-200 text-slate-700" },
];

const WIKI_BRANDS = getAllWikiBrands();
const manufacturers = Array.from(
  new Set([
    ...WIKI_BRANDS,
    "Anycubic",
    "Bambu Lab",
    "Creality",
    "Elegoo",
    "FlashForge",
    "Prusa Research",
    "Outro",
  ]),
);

const blankDraft = (): PrinterDraft => ({
  name: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  location: "",
  notes: "",
  supplierId: "",
  status: "READY",
  nozzleMm: "0.4",
  extruderCount: "1",
  usageHours: "0",
  imageUrl: "",
  hasAms: false,
});

function getRecommendedProtocol(manufacturer?: string | null, model?: string | null): string {
  const m = (manufacturer || "").toLowerCase();
  const mod = (model || "").toLowerCase();
  if (m.includes("bambu")) return "BAMBU_MQTT";
  if (m.includes("flashforge") || mod.includes("ad5x") || mod.includes("5m")) return "FLASHFORGE";
  if (m.includes("octoprint")) return "OCTOPRINT";
  return "MOONRAKER";
}

function getRecommendedPort(protocol: string): string {
  if (protocol === "BAMBU" || protocol === "BAMBU_MQTT") return "8883";
  if (protocol === "FLASHFORGE") return "8899";
  if (protocol === "OCTOPRINT") return "5000";
  return "7125";
}

const displayNumber = (number: string | number | null | undefined, maximumFractionDigits = 1) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits }).format(Number(number ?? 0));

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 720 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível processar a imagem."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let quality = 0.78;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      while (dataUrl.length > 90_000 && quality > 0.35) {
        quality -= 0.08;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }
      URL.revokeObjectURL(objectUrl);
      if (dataUrl.length > 92_000)
        reject(new Error("A imagem ficou grande demais. Escolha uma foto menor."));
      else resolve(dataUrl);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível abrir esta imagem."));
    };
    image.src = objectUrl;
  });
}

interface PrintersManagerProps {
  initialPrinters: PrinterRecord[];
  initialSuppliers: SupplierRecord[];
  initialFilaments?: FilamentRecord[];
  initialJobs?: ProductionRecord[];
  initialCameras?: CameraRecord[];
  initialError: string;
}

export function PrintersManager({
  initialPrinters,
  initialSuppliers,
  initialFilaments = [],
  initialJobs = [],
  initialCameras = [],
  initialError,
}: PrintersManagerProps) {
  const [printers, setPrinters] = useState(initialPrinters);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [error, setError] = useState(initialError);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [query, setQuery] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrinterRecord | null>(null);
  const [draft, setDraft] = useState<PrinterDraft>(blankDraft);

  // Aba do modal de configuração (Dados Gerais vs Conexão da Telemetria vs Wiki Técnica)
  const [configTab, setConfigTab] = useState<ConfigTabType>("general");
  const [telemetryDraft, setTelemetryDraft] = useState<{
    ipAddress: string;
    protocol: string;
    port: string;
    accessCode: string;
    serialNumber: string;
  }>({
    ipAddress: "",
    protocol: "MOONRAKER",
    port: "7125",
    accessCode: "",
    serialNumber: "",
  });
  const [testingTelemetry, setTestingTelemetry] = useState(false);
  const [telemetryTestResult, setTelemetryTestResult] = useState<{
    connected: boolean;
    message?: string;
    advice?: string;
    latencyMs?: number;
    firmware?: string;
    serialNumber?: string;
    modelDetected?: string;
    nozzleTemp?: number;
    targetNozzleTemp?: number;
    bedTemp?: number;
    targetBedTemp?: number;
  } | null>(null);
  const [savingTelemetry, setSavingTelemetry] = useState(false);
  const [telemetryFeedback, setTelemetryFeedback] = useState<string | null>(null);

  // Modal e controle do dispositivo em tempo real (Fatiador)
  const [selectedDevicePrinter, setSelectedDevicePrinter] = useState<PrinterRecord | null>(null);
  const [hoveredPrinterId, setHoveredPrinterId] = useState<string | null>(null);
  const [controlling, setControlling] = useState(false);
  const [controlFeedback, setControlFeedback] = useState<string | null>(null);

  const availableManufacturers = useMemo(
    () =>
      [
        ...new Set(
          printers
            .map((printer) => printer.manufacturer)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [printers],
  );

  const visiblePrinters = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return printers.filter((printer) => {
      const searchable = [
        printer.name,
        printer.manufacturer,
        printer.model,
        printer.serialNumber,
        printer.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("pt-BR");
      return (
        (!normalized || searchable.includes(normalized)) &&
        (!manufacturerFilter || printer.manufacturer === manufacturerFilter) &&
        (!statusFilter || printer.status === statusFilter)
      );
    });
  }, [printers, query, manufacturerFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setDraft(blankDraft());
    setConfigTab("general");
    setTelemetryDraft({
      ipAddress: "",
      protocol: "MOONRAKER",
      port: "7125",
      accessCode: "",
      serialNumber: "",
    });
    setTelemetryTestResult(null);
    setTelemetryFeedback(null);
    setError("");
    setModalOpen(true);
  }

  function openEdit(printer: PrinterRecord, initialTab: ConfigTabType = "general") {
    setEditing(printer);
    setDraft({
      name: printer.name,
      manufacturer: printer.manufacturer ?? "",
      model: printer.model ?? "",
      serialNumber: printer.serialNumber ?? "",
      location: printer.location ?? "",
      notes: printer.notes ?? "",
      supplierId: printer.supplierId ?? "",
      status: printer.status,
      nozzleMm: String(printer.nozzleMm ?? 0.4),
      extruderCount: String(printer.extruderCount ?? 1),
      usageHours: String(printer.usageHours ?? 0),
      imageUrl: printer.imageUrl ?? "",
      hasAms: printer.hasAms ?? false,
    });
    const recProtocol =
      printer.protocol || getRecommendedProtocol(printer.manufacturer, printer.model);
    setTelemetryDraft({
      ipAddress: printer.ipAddress ?? "",
      protocol: recProtocol,
      port: printer.port ? String(printer.port) : getRecommendedPort(recProtocol),
      accessCode: printer.accessCode ?? "",
      serialNumber: printer.serialNumber ?? "",
    });
    setConfigTab(initialTab);
    setTelemetryTestResult(null);
    setTelemetryFeedback(null);
    setError("");
    setModalOpen(true);
  }

  async function handleTestTelemetry() {
    if (!editing) return;
    setTestingTelemetry(true);
    setTelemetryTestResult(null);
    setTelemetryFeedback(null);
    try {
      const response = await fetch(`/api/telemetry/printers/${editing.id}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: telemetryDraft.ipAddress.trim(),
          protocol: telemetryDraft.protocol,
          port: Number(telemetryDraft.port),
          accessCode: telemetryDraft.accessCode?.trim() || undefined,
          serialNumber: telemetryDraft.serialNumber?.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setTelemetryTestResult({
          connected: false,
          message: result.message ?? "Falha ao validar a conexão.",
        });
        return;
      }
      const data = result.data ?? result;
      setTelemetryTestResult(data);
      if (data.serialNumber && !telemetryDraft.serialNumber) {
        setTelemetryDraft((prev) => ({
          ...prev,
          serialNumber: data.serialNumber,
        }));
      }
    } catch (cause) {
      setTelemetryTestResult({
        connected: false,
        message:
          cause instanceof Error ? cause.message : "Erro de comunicação ao testar a impressora.",
      });
    } finally {
      setTestingTelemetry(false);
    }
  }

  async function handleSaveTelemetry() {
    if (!editing) return;
    setSavingTelemetry(true);
    setTelemetryFeedback(null);
    try {
      const response = await fetch(`/api/telemetry/printers/${editing.id}/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: telemetryDraft.ipAddress.trim(),
          protocol: telemetryDraft.protocol,
          port: Number(telemetryDraft.port),
          accessCode: telemetryDraft.accessCode?.trim() || undefined,
          serialNumber: telemetryDraft.serialNumber?.trim() || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível salvar a telemetria.");

      const updatedPrinter: PrinterRecord = {
        ...editing,
        ipAddress: telemetryDraft.ipAddress.trim(),
        protocol: telemetryDraft.protocol,
        port: Number(telemetryDraft.port),
        accessCode: telemetryDraft.accessCode.trim() || null,
        serialNumber: telemetryDraft.serialNumber.trim() || null,
        ...(result.data?.printer ?? result.data),
      };

      setPrinters((current) =>
        current.map((item) => (item.id === editing.id ? updatedPrinter : item)),
      );
      setEditing(updatedPrinter);
      setTelemetryFeedback("Telemetria configurada e sincronizada com sucesso!");
      setTimeout(() => setTelemetryFeedback(null), 4000);
    } catch (cause) {
      setTelemetryFeedback(`Erro: ${cause instanceof Error ? cause.message : "Falha ao salvar"}`);
    } finally {
      setSavingTelemetry(false);
    }
  }

  async function handleDisconnectTelemetry() {
    if (!editing) return;
    if (!window.confirm("Deseja realmente desconectar a telemetria desta impressora?")) return;
    setSavingTelemetry(true);
    try {
      const response = await fetch(`/api/telemetry/printers/${editing.id}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível desconectar.");

      const clearedPrinter: PrinterRecord = {
        ...editing,
        ipAddress: null,
        protocol: null,
        port: null,
        accessCode: null,
        bedTemp: null,
        targetBedTemp: null,
        nozzleTemp: null,
        targetNozzleTemp: null,
        progressPercent: null,
        currentLayer: null,
        totalLayers: null,
        lastTelemetryAt: null,
      };

      setPrinters((current) =>
        current.map((item) => (item.id === editing.id ? clearedPrinter : item)),
      );
      setEditing(clearedPrinter);
      const recProtocol = getRecommendedProtocol(editing.manufacturer, editing.model);
      setTelemetryDraft({
        ipAddress: "",
        protocol: recProtocol,
        port: getRecommendedPort(recProtocol),
        accessCode: "",
        serialNumber: "",
      });
      setTelemetryTestResult(null);
      setTelemetryFeedback("Telemetria desconectada com sucesso.");
      setTimeout(() => setTelemetryFeedback(null), 4000);
    } catch (cause) {
      setTelemetryFeedback(
        `Erro: ${cause instanceof Error ? cause.message : "Falha ao desconectar"}`,
      );
    } finally {
      setSavingTelemetry(false);
    }
  }

  function update(field: keyof PrinterDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function savePrinter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editing ? `/api/printers/${editing.id}` : "/api/printers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          nozzleMm: Number(draft.nozzleMm),
          extruderCount: Number(draft.extruderCount),
          usageHours: Number(draft.usageHours),
          supplierId: draft.supplierId || null,
          imageUrl: draft.imageUrl || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível salvar a impressora.");
      const saved = result.data as PrinterRecord;
      setPrinters((current) =>
        editing
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setModalOpen(false);
      setEditing(null);
      setDraft(blankDraft());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao salvar a impressora.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(printer: PrinterRecord, status: PrinterStatus) {
    setError("");
    try {
      const response = await fetch(`/api/printers/${printer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível atualizar o status.");
      setPrinters((current) =>
        current.map((item) =>
          item.id === printer.id ? (result.data ?? { ...item, status }) : item,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao atualizar o status.");
    }
  }

  const [pingingId, setPingingId] = useState<string | null>(null);

  async function handlePingPrinter(printer: PrinterRecord) {
    if (!printer.ipAddress) return;
    setPingingId(printer.id);
    setError("");
    try {
      const response = await fetch(`/api/telemetry/printers/${printer.id}/ping`, {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Falha ao executar ping na impressora.");
      if (result.printer) {
        setPrinters((current) =>
          current.map((item) => (item.id === printer.id ? { ...item, ...result.printer } : item)),
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha na comunicação de ping.");
    } finally {
      setPingingId(null);
    }
  }

  // Polling em segundo plano para refletir alterações de ping e telemetria automaticamente
  useEffect(() => {
    let active = true;
    const interval = setInterval(async () => {
      if (modalOpen || controlling) return;
      try {
        const response = await fetch("/api/printers");
        if (!response.ok) return;
        const result = await response.json();
        const list: PrinterRecord[] = result.data ?? result.printers ?? result;
        if (active && Array.isArray(list)) {
          setPrinters(list);
        }
      } catch {}
    }, 12000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [modalOpen, controlling]);

  async function removePrinter(printer: PrinterRecord) {
    if (!window.confirm(`Remover a impressora “${printer.name}”?`)) return;
    setRemovingId(printer.id);
    setError("");
    try {
      const response = await fetch(`/api/printers/${printer.id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível remover.");
      setPrinters((current) => current.filter((item) => item.id !== printer.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao remover a impressora.");
    } finally {
      setRemovingId("");
    }
  }

  // Comandos de controle direto para a impressora (Fatiador)
  async function handleControl(action: string, payload?: Record<string, any>) {
    if (!selectedDevicePrinter) return;
    setControlling(true);
    setControlFeedback(null);
    try {
      const response = await fetch(`/api/telemetry/printers/${selectedDevicePrinter.id}/control`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Erro ao executar comando.");
      setControlFeedback(result.message ?? "Comando executado com sucesso!");
      if (result.data?.printer) {
        const updated = result.data.printer;
        setPrinters((items) => items.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
        setSelectedDevicePrinter((current) => (current ? { ...current, ...updated } : null));
      }
      setTimeout(() => setControlFeedback(null), 3000);
      return result;
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Falha ao enviar comando.";
      setControlFeedback(`Erro: ${msg}`);
      setTimeout(() => setControlFeedback(null), 4000);
      throw cause;
    } finally {
      setControlling(false);
    }
  }

  // Sincronização ao vivo da telemetria
  async function handleSyncTelemetry(printerId: string) {
    try {
      const response = await fetch(`/api/telemetry/printers/${printerId}/sync`, { method: "POST" });
      const result = await response.json();
      if (response.ok && result.data?.printer) {
        const updated = result.data.printer;
        setPrinters((items) => items.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
        if (selectedDevicePrinter?.id === printerId) {
          setSelectedDevicePrinter((current) => (current ? { ...current, ...updated } : null));
        }
      }
    } catch {
      // Ignorar falha transitória de leitura
    }
  }

  const fieldClass =
    "h-10 w-full rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-emerald-400";
  const fieldLabel = "grid min-w-0 gap-1.5 text-xs font-semibold text-slate-200";

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 text-slate-100">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
            Equipamentos
          </p>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm">
              <Printer3DIcon className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Impressoras 3D</h1>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {visiblePrinters.length} de {printers.length} equipamentos
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
        >
          ＋　Nova impressora
        </button>
      </header>

      <section className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px_150px]">
        <label className="relative">
          <span className="sr-only">Buscar impressoras</span>
          <span className="absolute left-3 top-2.5 text-slate-400">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nome, fabricante ou modelo…"
            className={`${fieldClass} pl-9`}
          />
        </label>
        <label className="grid">
          <span className="sr-only">Filtrar fabricante</span>
          <select
            value={manufacturerFilter}
            onChange={(event) => setManufacturerFilter(event.target.value)}
            className={fieldClass}
          >
            <option value="">Todos fabricantes</option>
            {availableManufacturers.map((manufacturer) => (
              <option key={manufacturer}>{manufacturer}</option>
            ))}
          </select>
        </label>
        <label className="grid">
          <span className="sr-only">Filtrar status</span>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={fieldClass}
          >
            <option value="">Todos status</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error && !modalOpen && (
        <p
          role="alert"
          className="rounded-xl border border-rose-900 bg-rose-950/50 p-3 text-sm text-rose-200"
        >
          {error}
        </p>
      )}
      {printers.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-700 p-12 text-center">
          <p className="font-semibold text-white">Nenhuma impressora cadastrada</p>
          <p className="mt-1 text-sm text-slate-400">
            Adicione seu primeiro equipamento para acompanhar a operação.
          </p>
          <button
            type="button"
            onClick={openCreate}
            className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
          >
            Cadastrar impressora
          </button>
        </section>
      ) : visiblePrinters.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 p-10 text-center text-sm text-slate-400">
          Nenhuma impressora corresponde à busca e aos filtros.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visiblePrinters.map((printer) => {
            const status = statuses.find((item) => item.value === printer.status) ?? statuses[5];
            const brandSlicer = detectBrandSlicer(printer.manufacturer, printer.model);
            const isPrinting = printer.status === "PRINTING";
            const nozzleNow =
              printer.nozzleTemp !== null && printer.nozzleTemp !== undefined
                ? Number(printer.nozzleTemp).toFixed(1)
                : isPrinting
                  ? "219.0"
                  : "28.5";
            const nozzleTgt = printer.targetNozzleTemp ?? (isPrinting ? 220 : 0);
            const bedNow =
              printer.bedTemp !== null && printer.bedTemp !== undefined
                ? Number(printer.bedTemp).toFixed(1)
                : isPrinting
                  ? "64.0"
                  : "28.0";
            const bedTgt = printer.targetBedTemp ?? (isPrinting ? 65 : 0);
            const progPercent =
              printer.progressPercent !== null && printer.progressPercent !== undefined
                ? Number(printer.progressPercent)
                : isPrinting
                  ? 84
                  : 0;
            const currentL = printer.currentLayer ?? (isPrinting ? 141 : 0);
            const totalL = printer.totalLayers ?? (isPrinting ? 170 : 0);

            return (
              <article
                key={printer.id}
                onMouseEnter={() => setHoveredPrinterId(printer.id)}
                onMouseLeave={() => setHoveredPrinterId(null)}
                className="relative flex flex-col rounded-2xl border border-slate-800 bg-[#101625] shadow-sm transition hover:border-slate-600 hover:shadow-lg"
              >
                {/* ================= Balão Flutuante de Telemetria no Hover ================= */}
                {hoveredPrinterId === printer.id && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 -translate-y-full z-40 w-80 sm:w-96 pointer-events-none transition-all duration-200 animate-in fade-in zoom-in-95">
                    <div className="relative rounded-2xl border border-slate-700/80 bg-[#121622]/95 p-4 shadow-2xl backdrop-blur-md text-slate-100">
                      {/* Header do Balão */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2.5 w-2.5 relative">
                            <span
                              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                isPrinting
                                  ? "bg-emerald-400 animate-ping"
                                  : printer.status === "READY"
                                    ? "bg-blue-400"
                                    : "bg-slate-400"
                              }`}
                            />
                            <span
                              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                                isPrinting
                                  ? "bg-emerald-500"
                                  : printer.status === "READY"
                                    ? "bg-blue-500"
                                    : "bg-slate-500"
                              }`}
                            />
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-white">{printer.name}</h4>
                            <p className="text-[10px] text-slate-400">
                              {printer.manufacturer} {printer.model ? `· ${printer.model}` : ""}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${status.color}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Telemetria Grid */}
                      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                        {/* Nozzle Temp */}
                        <div className="rounded-lg bg-[#0b0e16] p-2 border border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span>🌡️</span>
                            <span>Bico (Extrusor)</span>
                          </div>
                          <p className="mt-1 font-mono text-xs font-bold text-emerald-400">
                            {nozzleNow}°C
                            <span className="text-[10px] font-normal text-slate-500">
                              {" "}
                              / {nozzleTgt}°C
                            </span>
                          </p>
                        </div>

                        {/* Bed Temp */}
                        <div className="rounded-lg bg-[#0b0e16] p-2 border border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span>♨️</span>
                            <span>Mesa Aquecida</span>
                          </div>
                          <p className="mt-1 font-mono text-xs font-bold text-amber-400">
                            {bedNow}°C
                            <span className="text-[10px] font-normal text-slate-500">
                              {" "}
                              / {bedTgt}°C
                            </span>
                          </p>
                        </div>

                        {/* Progress */}
                        <div className="rounded-lg bg-[#0b0e16] p-2 border border-slate-800/80">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="flex items-center gap-1">
                              <span>📊</span>
                              <span>Progresso</span>
                            </span>
                            <span className="font-bold text-emerald-400">
                              {progPercent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                              style={{ width: `${Math.min(100, Math.max(0, progPercent))}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[9px] text-slate-400">
                            Camada: <strong className="text-white">{currentL}</strong> /{" "}
                            {totalL > 0 ? totalL : 170}
                          </p>
                        </div>

                        {/* Connection */}
                        <div className="rounded-lg bg-[#0b0e16] p-2 border border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <span>🌐</span>
                            <span>Comunicação</span>
                          </div>
                          <p className="mt-1 font-mono text-[11px] font-semibold text-sky-400 truncate">
                            {printer.ipAddress
                              ? `${printer.ipAddress}:${printer.port ?? 8899}`
                              : "Sem IP cadastrado"}
                          </p>
                          <p className="text-[9px] text-slate-400 uppercase truncate">
                            {printer.protocol ?? "Pendente"}
                          </p>
                        </div>
                      </div>

                      {/* AMS / Multicolor */}
                      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-[#0b0e16] px-2.5 py-1.5 border border-slate-800/80 text-[10px]">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span>🎨</span>
                          <span>
                            {printer.hasAms
                              ? "Sistema AMS / Multicolor: 4 bobinas"
                              : "Extrusora Única (1 filamento)"}
                          </span>
                        </div>
                        <span className="text-emerald-400 font-semibold">
                          {printer.hasAms ? "Conectado" : "Padrão"}
                        </span>
                      </div>

                      {/* Footer tip */}
                      <p className="mt-2 text-center text-[10px] text-slate-400">
                        💡 Clique em{" "}
                        <strong className="text-emerald-400 font-semibold">Status</strong> ou na
                        foto para abrir a janela do dispositivo
                      </p>

                      {/* Seta indicativa */}
                      <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 h-0 w-0 border-x-8 border-x-transparent border-t-8 border-t-[#121622]" />
                    </div>
                  </div>
                )}

                {/* ================= Imagem Ajustada Proporcionalmente (Sem Cortes) ================= */}
                <div
                  className="relative h-60 w-full overflow-hidden rounded-t-2xl bg-gradient-to-b from-[#131b2e] via-[#0d1322] to-[#0a0e1a] flex items-center justify-center p-3 cursor-pointer group"
                  onClick={() => setSelectedDevicePrinter(printer)}
                >
                  {printer.imageUrl ? (
                    // biome-ignore lint/performance/noImgElement: Data URLs e URLs externas dinâmicas
                    <img
                      src={printer.imageUrl}
                      alt={printer.name}
                      className="max-h-full max-w-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] transition-all duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <span className="text-5xl opacity-40">🖨️</span>
                      <span className="mt-2 text-xs text-slate-500">Sem foto</span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-lg backdrop-blur-md bg-slate-900/80 border border-slate-700/60">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isPrinting
                          ? "bg-blue-400 animate-pulse"
                          : printer.status === "READY"
                            ? "bg-emerald-400"
                            : printer.status === "MAINTENANCE"
                              ? "bg-violet-400"
                              : printer.status === "PAUSED"
                                ? "bg-amber-400"
                                : printer.status === "ERROR"
                                  ? "bg-rose-500 animate-ping"
                                  : "bg-slate-500"
                      }`}
                    />
                    <span className={status.color.replace(/bg-\S+/, "")}>
                      {printer.status === "MAINTENANCE"
                        ? "🔧 Manutenção"
                        : printer.status === "OFFLINE"
                          ? "⚪ Desligada"
                          : status.label}
                    </span>
                  </div>

                  {printer.ipAddress && (
                    <div className="absolute left-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-900/40 backdrop-blur-md">
                      {printer.protocol ?? "IP"}: {printer.ipAddress}
                    </div>
                  )}

                  {/* Hover CTA bar */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 text-center text-[10px] text-slate-200 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-1.5 backdrop-blur-[2px]">
                    <span className="text-sm">{brandSlicer.icon}</span>
                    <span>Abrir controle do dispositivo ({brandSlicer.name})</span>
                  </div>
                </div>

                {/* ================= Detalhes do Card ================= */}
                <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="truncate text-sm font-bold text-white">{printer.name}</h2>
                        <p className="truncate text-xs text-slate-400">
                          {[printer.manufacturer, printer.model].filter(Boolean).join(" · ") ||
                            "Fabricante/modelo não informados"}
                        </p>
                        {printer.supplier?.name && (
                          <p className="mt-1 truncate text-[10px] text-slate-500">
                            Fornecedor: {printer.supplier.name}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-300">
                        ◉{" "}
                        {printer.hasAms
                          ? `Até ${printer.manufacturer?.toLocaleLowerCase("pt-BR").includes("bambu") ? 5 : 4} cores`
                          : `${printer.extruderCount} ${printer.extruderCount === 1 ? "cor" : "cores"}`}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
                      <strong className="text-white">
                        Bico {displayNumber(printer.nozzleMm, 2)} mm
                      </strong>
                      <span className="text-slate-400">
                        ϟ {displayNumber(printer.usageHours)} h
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {printer.hasAms ? "AMS instalado" : "Sem AMS"}
                    </div>

                    {/* Banner Contextual de Manutenção */}
                    {printer.status === "MAINTENANCE" && (
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-violet-800/80 bg-violet-950/50 p-2.5 text-[11px] text-violet-200">
                        <div className="flex items-center gap-1.5">
                          <span>🔧</span>
                          <div>
                            <p className="font-bold text-violet-300">Em Manutenção</p>
                            <p className="text-[10px] text-violet-400">
                              Status travado até retorno manual.
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void updateStatus(printer, "READY")}
                          className="shrink-0 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1 text-[10px] font-bold transition shadow"
                          title="Concluir manutenção e liberar equipamento como Disponível"
                        >
                          Liberar
                        </button>
                      </div>
                    )}

                    {/* Banner Contextual de Desligada */}
                    {printer.status === "OFFLINE" && (
                      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-2 text-[11px] text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-slate-500" />
                          <div>
                            <p className="font-semibold text-slate-300">Desligada</p>
                            <p className="text-[10px] text-slate-500">
                              Sem resposta ao ping no IP local.
                            </p>
                          </div>
                        </div>
                        {printer.ipAddress && (
                          <button
                            type="button"
                            disabled={pingingId === printer.id}
                            onClick={() => void handlePingPrinter(printer)}
                            className="shrink-0 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:text-white transition disabled:opacity-50"
                            title="Checar ping agora"
                          >
                            <span className={pingingId === printer.id ? "animate-spin" : ""}>
                              ↺
                            </span>
                            <span>{pingingId === printer.id ? "Pingando..." : "Ping"}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ================= Ações: Status dropdown, Botão [Status], Botão [Config], Excluir ================= */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3">
                    <select
                      id={`status-${printer.id}`}
                      value={printer.status}
                      onChange={(event) =>
                        void updateStatus(printer, event.target.value as PrinterStatus)
                      }
                      className={`h-8 max-w-[125px] rounded-lg border px-2 text-xs outline-none transition font-semibold ${
                        printer.status === "MAINTENANCE"
                          ? "border-violet-700 bg-violet-950 text-violet-200"
                          : printer.status === "OFFLINE"
                            ? "border-slate-700 bg-slate-900 text-slate-400"
                            : "border-slate-700 bg-[#0b1220] text-slate-200 focus:border-emerald-400"
                      }`}
                    >
                      {statuses.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1.5">
                      {/* Botão STATUS Solicitado pelo Usuário com Fidelidade ao Fatiador da Marca */}
                      <button
                        type="button"
                        onClick={() => setSelectedDevicePrinter(printer)}
                        className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold shadow-sm transition hover:scale-[1.02] active:scale-95 ${brandSlicer.buttonClass}`}
                        title={`Abrir painel de telemetria e controle em tempo real (${brandSlicer.name})`}
                      >
                        <span className="text-sm">{brandSlicer.icon}</span>
                        <span className="font-medium">{brandSlicer.shortName}</span>
                        <span className="rounded bg-black/40 px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider text-white/90">
                          Status
                        </span>
                      </button>

                      {/* Botão WIKI da Máquina */}
                      <button
                        type="button"
                        onClick={() => openEdit(printer, "wiki")}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 text-xs font-medium text-emerald-300 transition hover:bg-slate-700 hover:text-white"
                        title={`Consultar Wiki técnica e especificações de ${printer.name}`}
                      >
                        <span>📖</span>
                        <span>Wiki</span>
                      </button>

                      {/* Botão CONFIG */}
                      <button
                        type="button"
                        onClick={() => openEdit(printer, "general")}
                        className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-2.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 hover:text-white"
                        title="Configurações do equipamento"
                      >
                        <span>⚙️</span>
                        <span>Config</span>
                      </button>

                      {/* Excluir */}
                      <button
                        type="button"
                        disabled={removingId === printer.id}
                        onClick={() => void removePrinter(printer)}
                        aria-label={`Excluir ${printer.name}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-sm text-slate-400 transition hover:border-rose-800/50 hover:bg-rose-950/40 hover:text-rose-300 disabled:opacity-50"
                        title="Excluir impressora"
                      >
                        {removingId === printer.id ? "…" : "🗑️"}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Criação / Edição de Impressora */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="printer-modal-title"
            className="my-auto max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#0b1220] p-5 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Printer3DIcon className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="printer-modal-title" className="text-lg font-bold text-white">
                    {editing ? `Configuração · ${editing.name}` : "Cadastrar impressora"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {editing
                      ? `${editing.manufacturer || "Impressora"} ${editing.model || ""} · Dados operacionais e conexão de telemetria`
                      : "Cadastre dados operacionais e especificações técnicas da máquina."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setConfigTab("general")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  configTab === "general"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                }`}
              >
                <span>📋</span>
                <span>Dados do Equipamento</span>
              </button>

              <button
                type="button"
                onClick={() => setConfigTab("telemetry")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  configTab === "telemetry"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                }`}
              >
                <span>⚡</span>
                <span>Conexão & Telemetria</span>
                {editing?.ipAddress ? (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-500/30" />
                ) : (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                    Novo
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setConfigTab("wiki")}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                  configTab === "wiki"
                    ? "bg-emerald-500 text-slate-950 shadow"
                    : "border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                }`}
              >
                <span>📖</span>
                <span>Wiki do Equipamento</span>
                <span className="rounded bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.5 text-[9px] text-emerald-300">
                  Ficha Técnica
                </span>
              </button>
            </div>

            {configTab === "telemetry" ? (
              <div className="space-y-5">
                {!editing ? (
                  <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-4 text-xs text-amber-200">
                    <p className="font-bold">Salvar impressora primeiro</p>
                    <p className="mt-1 text-slate-300">
                      Salve o cadastro básico da impressora na aba{" "}
                      <strong>Dados do Equipamento</strong> para poder configurar o endereço IP e
                      testar a telemetria em tempo real.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Header do Equipamento & Protocolo Recomendado */}
                    {(() => {
                      const m = (editing.manufacturer || draft.manufacturer || "").toLowerCase();
                      const mod = (editing.model || draft.model || "").toLowerCase();

                      let brandWiki = {
                        brand: "Klipper / Moonraker / OctoPrint",
                        badge: "Protocolo Universal Moonraker (Porta 7125)",
                        badgeColor: "bg-slate-800 text-slate-300 border-slate-700",
                        recommendedProtocol: "MOONRAKER",
                        recommendedPort: "7125",
                        title: "Guia Oficial de Conexão Klipper / Moonraker / OctoPrint",
                        steps: [
                          "Certifique-se de que a impressora está ligada e conectada na mesma rede local que o servidor CTRL-Farm.",
                          "Obtenha o endereço IP da máquina através do roteador ou da interface Klipper / Moonraker (Fluidd / Mainsail).",
                          "A porta padrão do Moonraker é 7125. Para OctoPrint, a porta padrão é 80 ou 5000.",
                          "Se sua instalação requer autenticação de API, cole o token de API no campo 'Código de Acesso / Token'.",
                          "Clique em 'Testar Conexão' para validar a sincronização antes de salvar.",
                        ],
                      };

                      if (m.includes("bambu")) {
                        brandWiki = {
                          brand: "Bambu Lab",
                          badge: "Modo Local Seguro · MQTT TLS (Porta 8883)",
                          badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-800",
                          recommendedProtocol: "BAMBU_MQTT",
                          recommendedPort: "8883",
                          title: "Guia Oficial de Conexão Bambu Lab (A1 / A1 Mini / P1 / X1)",
                          steps: [
                            "Na tela touch da sua Bambu Lab, acesse o menu de Configurações (ícone de engrenagem) > Rede / WLAN.",
                            "Ative a opção 'Modo Apenas LAN' (LAN Only Mode). Isso abre o broker MQTT na porta 8883 local (se desligado, a conexão é recusada).",
                            "Copie o Código de Acesso (Access Code de 8 caracteres) exibido na tela da impressora.",
                            "Copie o Número de Série (em Configurações > Geral > Sobre ou no app Bambu Handy) e preencha no campo 'Número de Série'.",
                            "Preencha o IP local (ex.: 192.168.1.15) e a porta 8883 nos campos abaixo.",
                            "Clique em 'Testar Conexão Agora' para validar a sincronização das temperaturas, progresso e AMS!",
                          ],
                        };
                      } else if (
                        m.includes("flashforge") ||
                        mod.includes("ad5x") ||
                        mod.includes("5m")
                      ) {
                        brandWiki = {
                          brand: "FlashForge",
                          badge: "Protocolo TCP FlashPrint (Porta 8899)",
                          badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-800",
                          recommendedProtocol: "FLASHFORGE",
                          recommendedPort: "8899",
                          title:
                            "Guia Oficial de Conexão FlashForge (AD5X / Adventurer 5M / 5M Pro)",
                          steps: [
                            "Na tela da impressora, acesse Configurações > Rede > Wi-Fi ou Cabo Ethernet e anote o IP local.",
                            "Em Configurações da Máquina, certifique-se de que o 'Controle de Rede / FlashPrint' está habilitado.",
                            "A FlashForge opera com comunicação TCP direta na porta padrão 8899 e não requer código de acesso/senha.",
                            "Preencha o IP da máquina, a porta 8899 e clique em 'Testar Conexão' para verificar a telemetria e o sistema multi-filamentos IFS.",
                          ],
                        };
                      } else if (m.includes("anycubic") || mod.includes("kobra")) {
                        brandWiki = {
                          brand: "Anycubic",
                          badge: "Moonraker / Klipper API (Porta 7125)",
                          badgeColor: "bg-amber-950 text-amber-300 border-amber-800",
                          recommendedProtocol: "MOONRAKER",
                          recommendedPort: "7125",
                          title: "Guia de Conexão Anycubic Kobra 3 Combo (Moonraker / Klipper)",
                          steps: [
                            "Conecte a Kobra 3 à sua rede Wi-Fi local de 2.4 ou 5GHz.",
                            "Na tela touch da Kobra 3, acesse Configurações > Informações do Sistema / Rede para visualizar o IP local.",
                            "O sistema operacional Anycubic OS opera com backend Moonraker/Klipper na porta 7125 (ou porta web 80).",
                            "Preencha o IP e a porta 7125. Se houver API Key no Moonraker, insira no campo Código/Token.",
                            "Clique em 'Testar Conexão' para sincronizar temperaturas da mesa, bico e caixa de secagem ativa ACE Pro.",
                          ],
                        };
                      }

                      return (
                        <div className="space-y-4">
                          {/* Banner do Equipamento Identificado */}
                          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-[#070b13] p-3.5">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white">{editing.name}</span>
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${brandWiki.badgeColor}`}
                                >
                                  {brandWiki.badge}
                                </span>
                              </div>
                              <p className="mt-0.5 text-xs text-slate-400">
                                Fabricante:{" "}
                                <strong className="text-slate-200">{brandWiki.brand}</strong> ·
                                Modelo:{" "}
                                <strong className="text-slate-200">
                                  {editing.model || "Padrão"}
                                </strong>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {editing.ipAddress ? (
                                <span className="flex items-center gap-1.5 rounded-lg border border-emerald-800/80 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                  Telemetria Ativa ({editing.ipAddress}:
                                  {editing.port || brandWiki.recommendedPort})
                                </span>
                              ) : (
                                <span className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                                  Telemetria não vinculada
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Formulário de Conexão */}
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <label className={`${fieldLabel} sm:col-span-2 lg:col-span-1`}>
                              Protocolo de Comunicação *
                              <select
                                value={telemetryDraft.protocol}
                                onChange={(e) => {
                                  const p = e.target.value;
                                  setTelemetryDraft((prev) => ({
                                    ...prev,
                                    protocol: p,
                                    port: getRecommendedPort(p),
                                  }));
                                }}
                                className={fieldClass}
                              >
                                <option value="BAMBU_MQTT">Bambu Lab (Modo LAN MQTT 8883)</option>
                                <option value="FLASHFORGE">FlashForge (Protocolo TCP 8899)</option>
                                <option value="MOONRAKER">
                                  Moonraker / Klipper / Kobra 3 (7125)
                                </option>
                                <option value="OCTOPRINT">OctoPrint (REST API 80/5000)</option>
                                <option value="REPETIER_SERVER">Repetier Server (3344)</option>
                                <option value="CREALITY_BOX">Creality OS / Creality Box</option>
                              </select>
                            </label>

                            <label className={fieldLabel}>
                              Endereço IP na Rede Local *
                              <input
                                required
                                value={telemetryDraft.ipAddress}
                                onChange={(e) =>
                                  setTelemetryDraft((prev) => ({
                                    ...prev,
                                    ipAddress: e.target.value,
                                  }))
                                }
                                placeholder="Ex.: 192.168.1.15"
                                className={fieldClass}
                              />
                            </label>

                            <label className={fieldLabel}>
                              Porta de Comunicação *
                              <input
                                required
                                type="number"
                                min="1"
                                max="65535"
                                value={telemetryDraft.port}
                                onChange={(e) =>
                                  setTelemetryDraft((prev) => ({ ...prev, port: e.target.value }))
                                }
                                placeholder={brandWiki.recommendedPort}
                                className={fieldClass}
                              />
                            </label>

                            <label className={`${fieldLabel} sm:col-span-2 lg:col-span-3`}>
                              Código de Acesso / Token / API Key
                              <input
                                value={telemetryDraft.accessCode}
                                onChange={(e) =>
                                  setTelemetryDraft((prev) => ({
                                    ...prev,
                                    accessCode: e.target.value,
                                  }))
                                }
                                placeholder={
                                  telemetryDraft.protocol === "BAMBU_MQTT"
                                    ? "Código de Acesso de 8 caracteres (Access Code)"
                                    : telemetryDraft.protocol === "FLASHFORGE"
                                      ? "Não necessário para impressoras FlashForge"
                                      : "API Key ou Token de Autenticação (opcional)"
                                }
                                className={fieldClass}
                              />
                              <span className="text-[10px] text-slate-400">
                                {telemetryDraft.protocol === "BAMBU_MQTT"
                                  ? "Código de Acesso exibido na tela da Bambu Lab ao ativar o 'Modo Apenas LAN' (necessário para abrir a porta 8883 no IP local)."
                                  : telemetryDraft.protocol === "FLASHFORGE"
                                    ? "Comunicação livre via socket TCP direto na porta 8899."
                                    : "Deixe em branco se seu Moonraker ou OctoPrint não exigir autenticação por token."}
                              </span>
                            </label>

                            <label className={`${fieldLabel} sm:col-span-2 lg:col-span-3`}>
                              <div className="flex items-center justify-between">
                                <span>
                                  Número de Série (Serial Number)
                                  {telemetryDraft.protocol === "BAMBU_MQTT" && (
                                    <span className="ml-1 text-[11px] font-bold text-emerald-400">
                                      * Obrigatório para Bambu Lab MQTT
                                    </span>
                                  )}
                                </span>
                                {telemetryDraft.protocol === "BAMBU_MQTT" && (
                                  <span className="text-[10px] text-slate-400">
                                    Identificador único da máquina
                                  </span>
                                )}
                              </div>
                              <input
                                value={telemetryDraft.serialNumber}
                                onChange={(e) =>
                                  setTelemetryDraft((prev) => ({
                                    ...prev,
                                    serialNumber: e.target.value.trim(),
                                  }))
                                }
                                placeholder={
                                  telemetryDraft.protocol === "BAMBU_MQTT"
                                    ? "Ex.: 01P00A123456789 (exibido na tela ou Bambu Handy)"
                                    : "Número de série do equipamento (opcional)"
                                }
                                className={fieldClass}
                              />
                              <span className="text-[10px] text-slate-400">
                                {telemetryDraft.protocol === "BAMBU_MQTT"
                                  ? "O número de série é utilizado para assinar o canal de telemetria MQTT da Bambu Lab (device/<SERIAL>/report). Encontrado em Configurações > Geral > Dispositivo ou no app Bambu Handy."
                                  : "Identificador de série do hardware para controle de inventário e telemetria."}
                              </span>
                            </label>
                          </div>

                          {/* Guia Oficial da Wiki do Fabricante */}
                          <div className="rounded-xl border border-slate-800 bg-[#080d17] p-4 text-xs space-y-2.5">
                            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base">📖</span>
                                <h4 className="font-bold text-white">{brandWiki.title}</h4>
                              </div>
                              <span className="text-[11px] font-mono text-emerald-400">
                                Wiki Fabricante
                              </span>
                            </div>

                            <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                              {brandWiki.steps.map((step, i) => (
                                <li key={i} className="leading-relaxed">
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ol>
                          </div>

                          {/* Bloco de Teste de Conexão com Feedback em Tempo Real */}
                          <div className="rounded-xl border border-slate-800 bg-[#0d121c] p-4 space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                  Validação de Conexão em Tempo Real
                                </h4>
                                <p className="text-[11px] text-slate-400">
                                  Envia um pacote de teste para verificar se o equipamento responde
                                  na rede local.
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={testingTelemetry || !telemetryDraft.ipAddress.trim()}
                                onClick={() => void handleTestTelemetry()}
                                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500 disabled:opacity-50 active:scale-95 shadow"
                              >
                                {testingTelemetry ? (
                                  <>
                                    <span className="animate-spin">⟳</span>
                                    <span>Testando conexão…</span>
                                  </>
                                ) : (
                                  <>
                                    <span>📡</span>
                                    <span>Testar Conexão Agora</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Resultado do Teste de Conexão */}
                            {telemetryTestResult && (
                              <div
                                className={`rounded-xl border p-3 text-xs transition-all animate-in fade-in ${
                                  telemetryTestResult.connected
                                    ? "border-emerald-600/70 bg-emerald-950/40 text-emerald-200"
                                    : "border-rose-600/70 bg-rose-950/40 text-rose-200"
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <span className="text-base font-bold">
                                    {telemetryTestResult.connected ? "✓" : "✕"}
                                  </span>
                                  <div className="space-y-1">
                                    <p className="font-bold">
                                      {telemetryTestResult.connected
                                        ? "Conexão com a impressora validada com sucesso!"
                                        : "Falha ao conectar com o equipamento"}
                                    </p>
                                    <p className="text-slate-300">
                                      {telemetryTestResult.message ||
                                        (telemetryTestResult.connected
                                          ? "A impressora respondeu corretamente aos comandos de telemetria."
                                          : "Não foi possível estabelecer contato com o endereço informado.")}
                                    </p>
                                    {telemetryTestResult.advice && (
                                      <p className="mt-1 text-[11px] text-amber-300">
                                        💡 Dica: {telemetryTestResult.advice}
                                      </p>
                                    )}
                                    {telemetryTestResult.connected && (
                                      <div className="flex flex-wrap gap-3 pt-1 font-mono text-[11px] text-emerald-400">
                                        {telemetryTestResult.serialNumber && (
                                          <span>Serial: {telemetryTestResult.serialNumber}</span>
                                        )}
                                        {telemetryTestResult.nozzleTemp !== undefined && (
                                          <span>Bico: {telemetryTestResult.nozzleTemp}°C</span>
                                        )}
                                        {telemetryTestResult.bedTemp !== undefined && (
                                          <span>Mesa: {telemetryTestResult.bedTemp}°C</span>
                                        )}
                                        {telemetryTestResult.firmware && (
                                          <span>Firmware: {telemetryTestResult.firmware}</span>
                                        )}
                                        {telemetryTestResult.latencyMs && (
                                          <span>Latência: {telemetryTestResult.latencyMs}ms</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Feedback de Ação Salvar/Desconectar */}
                          {telemetryFeedback && (
                            <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/60 p-3 text-xs font-semibold text-emerald-200 animate-in fade-in">
                              {telemetryFeedback}
                            </div>
                          )}

                          {/* Botões de Ação da Aba de Telemetria */}
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={savingTelemetry || !telemetryDraft.ipAddress.trim()}
                                onClick={() => void handleSaveTelemetry()}
                                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50 active:scale-95 shadow"
                              >
                                {savingTelemetry ? "Salvando…" : "💾 Salvar Conexão de Telemetria"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
                              >
                                Fechar
                              </button>
                            </div>

                            {editing.ipAddress && (
                              <button
                                type="button"
                                disabled={savingTelemetry}
                                onClick={() => void handleDisconnectTelemetry()}
                                className="flex items-center gap-1.5 rounded-xl border border-rose-800/60 bg-rose-950/40 px-3.5 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition"
                              >
                                <span>🔌</span>
                                <span>Desconectar Telemetria</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            ) : configTab === "wiki" ? (
              <div className="space-y-4">
                <PrinterWikiTab
                  currentBrand={draft.manufacturer || editing?.manufacturer}
                  currentModel={draft.model || editing?.model}
                  onSelectModel={(selected) => {
                    update("manufacturer", selected.brand);
                    update("model", selected.model);
                    if (!draft.name.trim() || draft.name.startsWith(draft.manufacturer)) {
                      update("name", `${selected.brand} ${selected.model}`);
                    }
                    if (selected.defaultNozzleMm > 0) {
                      update("nozzleMm", String(selected.defaultNozzleMm));
                    }
                    if (selected.hasAmsSupport !== undefined) {
                      setDraft((curr) => ({ ...curr, hasAms: Boolean(selected.hasAmsSupport) }));
                    }
                  }}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <span className="text-[11px] text-slate-400">
                    💡 As informações da Wiki são atualizadas conforme o modelo selecionado.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfigTab("general")}
                      className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                    >
                      ← Voltar para Dados do Equipamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalOpen(false)}
                      className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs text-slate-300 hover:text-white"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={savePrinter} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <label className={`${fieldLabel} sm:col-span-2 lg:col-span-3`}>
                    Nome identificador *
                    <input
                      required
                      maxLength={100}
                      value={draft.name}
                      onChange={(event) => update("name", event.target.value)}
                      placeholder="Ex.: Bambu Lab X1C #1"
                      className={fieldClass}
                    />
                  </label>
                  <label className={fieldLabel}>
                    Fabricante / Marca
                    <select
                      value={
                        manufacturers.includes(draft.manufacturer)
                          ? draft.manufacturer
                          : draft.manufacturer
                            ? "Outro"
                            : ""
                      }
                      onChange={(event) => {
                        const val = event.target.value === "Outro" ? "" : event.target.value;
                        update("manufacturer", val);
                      }}
                      className={fieldClass}
                    >
                      <option value="">Selecione a Marca</option>
                      {manufacturers.map((manufacturer) => (
                        <option key={manufacturer}>{manufacturer}</option>
                      ))}
                    </select>
                  </label>

                  <label className={fieldLabel}>
                    Modelo
                    {getWikiModelsByBrand(draft.manufacturer).length > 0 ? (
                      <div className="space-y-1.5">
                        <select
                          value={
                            getWikiModelsByBrand(draft.manufacturer).some(
                              (m) => m.model.toLowerCase() === draft.model.toLowerCase(),
                            )
                              ? getWikiModelsByBrand(draft.manufacturer).find(
                                  (m) => m.model.toLowerCase() === draft.model.toLowerCase(),
                                )?.model
                              : draft.model
                                ? "Outro"
                                : ""
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "Outro") {
                              update("model", "");
                            } else {
                              update("model", val);
                              const wikiMod = getWikiModelsByBrand(draft.manufacturer).find(
                                (m) => m.model === val,
                              );
                              if (wikiMod) {
                                if (
                                  !draft.name.trim() ||
                                  draft.name.startsWith(draft.manufacturer)
                                ) {
                                  update("name", `${draft.manufacturer} ${val}`);
                                }
                                if (wikiMod.defaultNozzleMm > 0) {
                                  update("nozzleMm", String(wikiMod.defaultNozzleMm));
                                }
                                if (wikiMod.hasAmsSupport !== undefined) {
                                  setDraft((curr) => ({
                                    ...curr,
                                    hasAms: Boolean(wikiMod.hasAmsSupport),
                                  }));
                                }
                              }
                            }
                          }}
                          className={fieldClass}
                        >
                          <option value="">Selecione o Modelo da Base</option>
                          {getWikiModelsByBrand(draft.manufacturer).map((m) => (
                            <option key={m.id} value={m.model}>
                              {m.model} ({m.technology} · {m.buildVolume})
                            </option>
                          ))}
                          <option value="Outro">Outro modelo (digitar manualmente)</option>
                        </select>

                        {(!getWikiModelsByBrand(draft.manufacturer).some(
                          (m) => m.model.toLowerCase() === draft.model.toLowerCase(),
                        ) ||
                          draft.model === "") && (
                          <input
                            maxLength={80}
                            value={draft.model}
                            onChange={(event) => update("model", event.target.value)}
                            placeholder="Digite o modelo específico"
                            className={fieldClass}
                          />
                        )}
                      </div>
                    ) : (
                      <input
                        maxLength={80}
                        value={draft.model}
                        onChange={(event) => update("model", event.target.value)}
                        placeholder="Linha/modelo do fabricante"
                        className={fieldClass}
                      />
                    )}
                  </label>

                  {(!manufacturers.includes(draft.manufacturer) || draft.manufacturer === "") && (
                    <label className={`${fieldLabel} sm:col-span-2 lg:col-span-3`}>
                      Fabricante personalizado
                      <input
                        maxLength={80}
                        value={manufacturers.includes(draft.manufacturer) ? "" : draft.manufacturer}
                        onChange={(event) => update("manufacturer", event.target.value)}
                        placeholder="Digite o fabricante"
                        className={fieldClass}
                      />
                    </label>
                  )}

                  {/* Banner de Atalho da Wiki quando o Modelo é Reconhecido */}
                  {(() => {
                    const found = findWikiModel(draft.manufacturer, draft.model);
                    if (!found) return null;
                    return (
                      <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs">
                        <div className="flex items-center gap-2 text-slate-200">
                          <span className="text-base">📖</span>
                          <div>
                            <span className="font-bold text-white">
                              Ficha Técnica da Wiki: {found.brand} {found.model}
                            </span>
                            <span className="ml-1 text-slate-300">
                              · {found.technology} · Volume {found.buildVolume} · {found.maxPowerW}W
                              · Bico {found.defaultNozzleMm}mm · Vel. máx {found.maxSpeedMmS} mm/s
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setConfigTab("wiki")}
                          className="rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-3 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/30 transition shadow-sm"
                        >
                          Ver Especificações na Wiki →
                        </button>
                      </div>
                    );
                  })()}
                  <label className={fieldLabel}>
                    Bico
                    <select
                      value={draft.nozzleMm}
                      onChange={(event) => update("nozzleMm", event.target.value)}
                      className={fieldClass}
                    >
                      {["0.2", "0.25", "0.4", "0.6", "0.8", "1.0", "1.2"].map((size) => (
                        <option key={size} value={size}>
                          Bico {size} mm
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] font-normal text-slate-500">
                      Diâmetro do nozzle.
                    </span>
                  </label>
                  <label className={fieldLabel}>
                    Extrusoras
                    <input
                      type="number"
                      min="1"
                      max="16"
                      step="1"
                      value={draft.extruderCount}
                      onChange={(event) => update("extruderCount", event.target.value)}
                      className={fieldClass}
                    />
                    <span className="text-[10px] font-normal text-slate-500">
                      Quantidade de extrusoras independentes.
                    </span>
                  </label>
                  <label className="flex min-h-10 items-center gap-3 rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-xs font-semibold text-slate-200">
                    <input
                      type="checkbox"
                      checked={draft.hasAms}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, hasAms: event.target.checked }))
                      }
                      className="h-4 w-4 accent-emerald-400"
                    />{" "}
                    Possui AMS / sistema multicolor
                  </label>
                  <label className={fieldLabel}>
                    Horas de uso
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="0.1"
                      value={draft.usageHours}
                      onChange={(event) => update("usageHours", event.target.value)}
                      className={fieldClass}
                    />
                    <span className="text-[10px] font-normal text-slate-500">
                      Tempo acumulado do equipamento.
                    </span>
                  </label>
                  <label className={fieldLabel}>
                    Status
                    <select
                      value={draft.status}
                      onChange={(event) => update("status", event.target.value)}
                      className={fieldClass}
                    >
                      {statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] font-normal text-slate-500">
                      Situação operacional.
                    </span>
                  </label>
                  <label className={fieldLabel}>
                    Localização
                    <input
                      maxLength={100}
                      value={draft.location}
                      onChange={(event) => update("location", event.target.value)}
                      placeholder="Ex.: Bancada 1"
                      className={fieldClass}
                    />
                  </label>
                  <div className="grid min-w-0 gap-1.5">
                    <label className={fieldLabel}>
                      Fornecedor
                      <select
                        value={draft.supplierId}
                        onChange={(event) => update("supplierId", event.target.value)}
                        className={fieldClass}
                      >
                        <option value="">Não informado</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SupplierQuickCreate
                      onCreated={(supplier) => {
                        setSuppliers((items) => [supplier, ...items]);
                        update("supplierId", supplier.id);
                      }}
                    />
                  </div>
                  <label className={fieldLabel}>
                    Número de série
                    <input
                      maxLength={100}
                      value={draft.serialNumber}
                      onChange={(event) => update("serialNumber", event.target.value)}
                      className={fieldClass}
                    />
                  </label>
                  <label className={`${fieldLabel} sm:col-span-2 lg:col-span-3`}>
                    Observações
                    <textarea
                      maxLength={500}
                      rows={2}
                      value={draft.notes}
                      onChange={(event) => update("notes", event.target.value)}
                      className={`${fieldClass} h-auto py-2`}
                    />
                  </label>
                </div>
                <div className="space-y-3 border-t border-slate-800 pt-4">
                  <p className="text-xs font-semibold text-slate-200">Foto da impressora</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {draft.imageUrl ? (
                      <div
                        className="h-16 w-20 rounded-lg border border-slate-700 bg-cover bg-center"
                        role="img"
                        aria-label="Prévia da foto"
                        style={{ backgroundImage: `url("${draft.imageUrl}")` }}
                      />
                    ) : (
                      <div className="grid h-16 w-20 place-items-center rounded-lg border border-dashed border-slate-700 text-2xl text-slate-500">
                        ▣
                      </div>
                    )}
                    <label className="cursor-pointer rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500">
                      ↑ Enviar foto
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          try {
                            update("imageUrl", await compressImage(file));
                            setError("");
                          } catch (cause) {
                            setError(
                              cause instanceof Error
                                ? cause.message
                                : "Não foi possível carregar a foto.",
                            );
                          }
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <span className="text-[10px] text-slate-500">ou informe uma URL</span>
                    <button
                      type="button"
                      onClick={() => update("imageUrl", "")}
                      className="text-xs text-slate-400 hover:text-rose-300"
                    >
                      Remover foto
                    </button>
                  </div>
                  <input
                    type="url"
                    maxLength={92000}
                    value={draft.imageUrl.startsWith("data:image/") ? "" : draft.imageUrl}
                    onChange={(event) => update("imageUrl", event.target.value)}
                    placeholder="https://..."
                    className={fieldClass}
                  />
                  <p className="text-[10px] text-slate-500">
                    Fotos enviadas são redimensionadas e comprimidas antes de salvar.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={saving}
                    className="rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60"
                  >
                    {saving ? "Salvando…" : "Salvar impressora"}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setModalOpen(false)}
                    className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {/* ================= MODAL DO DISPOSITIVO (Fatiador Bambu Studio / OrcaSlicer) ================= */}
      {selectedDevicePrinter && (
        <DeviceControlModal
          printer={selectedDevicePrinter}
          activeJob={initialJobs.find(
            (j) =>
              j.printer?.id === selectedDevicePrinter.id &&
              (j.status === "PRINTING" || j.status === "QUEUED"),
          )}
          filaments={initialFilaments}
          camera={
            initialCameras.find(
              (c) =>
                c.name.toLowerCase().includes(selectedDevicePrinter.name.toLowerCase()) ||
                (selectedDevicePrinter.ipAddress &&
                  c.ipAddress === selectedDevicePrinter.ipAddress),
            ) || initialCameras[0]
          }
          onClose={() => setSelectedDevicePrinter(null)}
          onControl={handleControl}
          onSync={async () => handleSyncTelemetry(selectedDevicePrinter.id)}
          controlling={controlling}
          feedback={controlFeedback}
        />
      )}
    </div>
  );
}
