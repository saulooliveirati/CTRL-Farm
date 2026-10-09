import "server-only";

import { cookies } from "next/headers";

export type ProductionRecord = {
  id: string;
  name: string;
  status: "QUEUED" | "PRINTING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";
  plannedWeightG: number;
  actualWeightG: number | null;
  startedAt: string | null;
  orderId: string | null;
  order: { id: string; description: string } | null;
  createdAt: string;
  printer: { id: string; name: string };
  filament: { id: string; material: string; brand: string; color: string };
};

export async function getProductionForPage(): Promise<{ jobs: ProductionRecord[]; error: string }> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { jobs: [], error: "Sessão ausente." };
  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/production`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return { jobs: [], error: result.message ?? "Não foi possível carregar as ordens." };
    return { jobs: result.data ?? [], error: "" };
  } catch {
    return { jobs: [], error: "Não foi possível conectar à API." };
  }
}
