import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ctrlfarm_session")?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: "Sessão ausente." },
      { status: 401 },
    );
  }

  try {
    const upstream = await fetch(apiUrl + "/auth/me", {
      headers: { Authorization: "Bearer " + token },
      cache: "no-store",
    });
    const result = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      const response = NextResponse.json(
        { success: false, message: "Sessão inválida ou expirada." },
        { status: 401 },
      );
      response.cookies.set("ctrlfarm_session", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({ success: true, data: result?.data });
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível conectar à API." },
      { status: 503 },
    );
  }
}