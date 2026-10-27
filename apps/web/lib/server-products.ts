import "server-only";

import { cookies } from "next/headers";

export type ProductRecord = {
  id: string;
  companyId: string;
  sku?: string | null;
  name: string;
  category?: string | null;
  imageUrl?: string | null;
  quantity: number;
  minQuantity: number;
  costPrice: number;
  sellingPrice: number;
  weightGrams?: number | null;
  dimensions?: string | null;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "DISCONTINUED";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

export async function getProductsForPage(): Promise<{
  products: ProductRecord[];
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { products: [], error: "Sessão ausente." };
  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/products`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return { products: [], error: result.message ?? "Não foi possível carregar os produtos." };
    return { products: result.data ?? [], error: "" };
  } catch {
    return { products: [], error: "Não foi possível conectar à API." };
  }
}
