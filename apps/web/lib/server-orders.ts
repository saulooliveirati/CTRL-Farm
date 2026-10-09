import "server-only";

import { cookies } from "next/headers";

export type OrderRecord = {
  id: string; description: string; quantity: number; unitPrice: string; dueAt: string | null;
  status: "DRAFT" | "IN_PRODUCTION" | "COMPLETED" | "CANCELLED";
  customer: { id: string; name: string };
  productionJob: { id: string; name: string; status: string } | null;
};

export async function getOrdersForPage(): Promise<{ orders: OrderRecord[]; error: string }> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { orders: [], error: "Sessão ausente." };
  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/orders`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) return { orders: [], error: result.message ?? "Não foi possível carregar os pedidos." };
    return { orders: result.data ?? [], error: "" };
  } catch { return { orders: [], error: "Não foi possível conectar à API." }; }
}
