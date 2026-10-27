import "server-only";

import { cookies } from "next/headers";

export type UserProfileRecord = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";
  active: boolean;
  createdAt: string;
  updatedAt: string;
  companyId: string;
  companyName: string;
  companyCreatedAt?: string | null;
};

export type CompanyUserRecord = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function getUserProfile(): Promise<{
  profile: UserProfileRecord | null;
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { profile: null, error: "Sessão ausente." };

  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        profile: null,
        error: result.message ?? "Não foi possível carregar os dados do usuário.",
      };
    }

    return { profile: result.data ?? null, error: "" };
  } catch {
    return { profile: null, error: "Não foi possível conectar à API." };
  }
}

export async function getCompanyUsers(): Promise<{
  users: CompanyUserRecord[];
  error: string;
}> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { users: [], error: "Sessão ausente." };

  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/users`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        users: [],
        error: result.message ?? "Não foi possível listar os usuários da empresa.",
      };
    }

    return { users: result.data ?? [], error: "" };
  } catch {
    return { users: [], error: "Não foi possível conectar à API." };
  }
}
