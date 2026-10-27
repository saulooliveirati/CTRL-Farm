import "server-only";
import { cookies } from "next/headers";

export type CameraRecord = {
  id: string;
  name: string;
  model: string | null;
  ipAddress: string;
  quality: "HIGH" | "STANDARD";
  username: string;
  streamPath: string;
  streamConfigured: boolean;
  createdAt: string;
};

export async function getCamerasForPage(): Promise<{ cameras: CameraRecord[]; error: string }> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return { cameras: [], error: "Sessão ausente." };
  try {
    const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";
    const response = await fetch(`${apiUrl}/cameras`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok)
      return { cameras: [], error: result.message ?? "Não foi possível carregar as câmeras." };
    return { cameras: result.data ?? [], error: "" };
  } catch {
    return { cameras: [], error: "Não foi possível conectar à API." };
  }
}
