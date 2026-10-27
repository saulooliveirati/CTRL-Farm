import "server-only";

import { cookies } from "next/headers";

export type CustomerRecord = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  _count?: { orders: number };
};

export async function getCustomersForPage(): Promise<{
  customers: CustomerRecord[];
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { customers: [], error: "Sessão ausente." };
  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/customers`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return { customers: [], error: result.message ?? "Não foi possível carregar os clientes." };
    return { customers: result.data ?? [], error: "" };
  } catch {
    return { customers: [], error: "Não foi possível conectar à API." };
  }
}
