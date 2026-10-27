import { NextResponse } from "next/server";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  let registration: unknown;

  try {
    registration = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Envie os dados do cadastro em JSON." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(apiUrl + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(registration),
      cache: "no-store",
    });
    const result = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          message: result?.message ?? "Não foi possível criar a conta.",
        },
        { status: upstream.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível conectar à API." },
      { status: 503 },
    );
  }
}
