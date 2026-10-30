import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: "Sessão ausente." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const upstream = await fetch(`${apiUrl}/support/media/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      cache: "no-store",
    });

    const payload = await upstream
      .json()
      .catch(() => ({ success: false, message: "Resposta inválida da API." }));
    return NextResponse.json(payload, { status: upstream.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Falha ao enviar arquivo de mídia para suporte." },
      { status: 503 },
    );
  }
}
