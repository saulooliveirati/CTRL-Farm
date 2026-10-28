import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function GET() {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: "Sessão ausente." }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${apiUrl}/backup/export`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ message: "Erro ao exportar backup" }));
      return NextResponse.json(err, { status: upstream.status });
    }

    const jsonText = await upstream.text();
    const disposition =
      upstream.headers.get("Content-Disposition") || 'attachment; filename="ctrlfarm-backup.json"';

    return new Response(jsonText, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": disposition,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: `Erro ao conectar à API de backup: ${err.message}` },
      { status: 503 }
    );
  }
}
