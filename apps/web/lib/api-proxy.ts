import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function proxyAuthenticatedApiRequest(path: string, request: Request, method: string) {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) return NextResponse.json({ success: false, message: "Sessão ausente." }, { status: 401 });

  let body: string | undefined;
  if (method !== "GET" && method !== "DELETE") body = await request.text();
  try {
    const upstream = await fetch(`${apiUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body } : {}),
      cache: "no-store",
    });
    const payload = await upstream.json().catch(() => ({ success: false, message: "Resposta inválida da API." }));
    const response = NextResponse.json(payload, { status: upstream.status });
    if (upstream.status === 401) {
      response.cookies.set("ctrlfarm_session", "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    }
    return response;
  } catch {
    return NextResponse.json({ success: false, message: "Não foi possível conectar à API." }, { status: 503 });
  }
}
