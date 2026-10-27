import { NextResponse } from "next/server";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const version = url.searchParams.get("version") || "v2.5.0";

  try {
    const res = await fetch(`${apiUrl}/licensing/updates?version=${encodeURIComponent(version)}`, {
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível consultar atualizações." },
      { status: 503 },
    );
  }
}
