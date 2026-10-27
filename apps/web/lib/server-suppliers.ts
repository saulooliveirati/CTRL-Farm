import "server-only";

import { cookies } from "next/headers";

export type SupplierRecord = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
};

export async function getSuppliersForPage(): Promise<{
  suppliers: SupplierRecord[];
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { suppliers: [], error: "Sessão ausente." };
  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/suppliers`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return { suppliers: [], error: result.message ?? "Não foi possível carregar fornecedores." };
    return { suppliers: result.data ?? [], error: "" };
  } catch {
    return { suppliers: [], error: "Não foi possível conectar à API." };
  }
}
