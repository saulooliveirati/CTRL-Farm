import "server-only";

import { cookies } from "next/headers";

export type CompanyRecord = {
  id: string;
  name: string;
  tradeName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users?: number;
    printers?: number;
    filaments?: number;
    orders?: number;
  };
};

export async function getCompanyDetails(): Promise<{
  company: CompanyRecord | null;
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { company: null, error: "Sessão ausente." };

  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/companies/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        company: null,
        error: result.message ?? "Não foi possível carregar os dados da empresa.",
      };
    }

    return { company: result.data ?? null, error: "" };
  } catch {
    return { company: null, error: "Não foi possível conectar à API." };
  }
}
