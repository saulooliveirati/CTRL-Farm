import "server-only";

import { cookies } from "next/headers";

import type { PublicUser } from "./auth-types";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ctrlfarm_session")?.value;

  if (!token) {
    return null;
  }

  try {
    const response = await fetch(apiUrl + "/auth/me", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return (result?.data as PublicUser | undefined) ?? null;
  } catch {
    return null;
  }
}

export const getAuthenticatedUser = getCurrentUser;
