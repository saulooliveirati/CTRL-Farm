import "server-only";

import { cookies } from "next/headers";

export type PrinterRecord = {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string | null;
  notes: string | null;
  nozzleMm: string | number;
  extruderCount: number;
  hasAms: boolean;
  usageHours: string | number;
  imageUrl: string | null;
  status: "READY" | "PRINTING" | "PAUSED" | "ERROR" | "MAINTENANCE" | "OFFLINE";
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
  createdAt: string;

  // Telemetria e Hardware
  ipAddress?: string | null;
  protocol?: string | null;
  accessCode?: string | null;
  port?: number | null;
  bedTemp?: number | string | null;
  targetBedTemp?: number | string | null;
  nozzleTemp?: number | string | null;
  targetNozzleTemp?: number | string | null;
  progressPercent?: number | string | null;
  currentLayer?: number | null;
  totalLayers?: number | null;
  lastTelemetryAt?: string | null;
};

export async function getPrintersForPage(): Promise<{ printers: PrinterRecord[]; error: string }> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { printers: [], error: "Sessão ausente." };

  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/printers`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return { printers: [], error: result.message ?? "Não foi possível carregar as impressoras." };
    return { printers: result.data ?? [], error: "" };
  } catch {
    return { printers: [], error: "Não foi possível conectar à API." };
  }
}
