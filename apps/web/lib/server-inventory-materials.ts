import "server-only";

import { cookies } from "next/headers";

export type InventoryCategory =
  | "EQUIPMENT"
  | "CONSUMABLE"
  | "SPARE_PART"
  | "TOOL"
  | "PACKAGING"
  | "OTHER";
export type InventoryMaterialRecord = {
  id: string;
  name: string;
  category: InventoryCategory;
  sku: string | null;
  unit: string;
  currentQuantity: string | number;
  minimumQuantity: string | number;
  unitCost: string | null;
  notes: string | null;
  supplierId: string | null;
  supplier: { id: string; name: string } | null;
};

export async function getInventoryMaterialsForPage(): Promise<{
  materials: InventoryMaterialRecord[];
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { materials: [], error: "Sessão ausente." };
  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/inventory-materials`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return { materials: [], error: result.message ?? "Não foi possível carregar o estoque." };
    return { materials: result.data ?? [], error: "" };
  } catch {
    return { materials: [], error: "Não foi possível conectar à API." };
  }
}
