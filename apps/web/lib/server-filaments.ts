import "server-only";

import { cookies } from "next/headers";

export type FilamentRecord = {
  id: string;
  material: "PLA" | "PETG" | "ABS" | "ASA" | "TPU" | "NYLON" | "PC" | "OTHER";
  brand: string;
  color: string;
  initialWeightG: number;
  currentWeightG: number;
  price: string | null;
  lot: string | null;
  purchasedAt: string | null;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
};

export async function getFilamentsForPage(): Promise<{
  filaments: FilamentRecord[];
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { filaments: [], error: "Sessão ausente." };
  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/filaments`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return { filaments: [], error: result.message ?? "Não foi possível carregar os filamentos." };
    return { filaments: result.data ?? [], error: "" };
  } catch {
    return { filaments: [], error: "Não foi possível conectar à API." };
  }
}
