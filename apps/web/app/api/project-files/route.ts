import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export const runtime = "nodejs";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/project-files", request, "GET");
}

export async function POST(request: Request) {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token)
    return NextResponse.json({ success: false, message: "Sessão ausente." }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";

  // Se o envio for JSON puro (cadastro por link ou sem upload imediato)
  if (contentType.includes("application/json")) {
    return proxyAuthenticatedApiRequest("/project-files/catalog", request, "POST");
  }

  // Caso seja envio de arquivo binário multipart
  try {
    const formData = await request.formData();
    const upstream = await fetch(`${apiUrl}/project-files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    });
    const payload = await upstream
      .json()
      .catch(() => ({ success: false, message: "Resposta inválida da API." }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível enviar o arquivo." },
      { status: 503 },
    );
  }
}
