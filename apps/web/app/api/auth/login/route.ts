import { NextResponse } from "next/server";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function POST(request: Request) {
  let credentials: unknown;

  try {
    credentials = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Envie os dados de acesso em JSON." },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(apiUrl + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
      cache: "no-store",
    });
    const result = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        {
          success: false,
          message: result?.message ?? "Não foi possível entrar.",
        },
        { status: upstream.status },
      );
    }

    const login = result?.data;

    // Se o usuário tem autenticação em 2 fatores (2FA) ativada
    if (login?.requires2FA) {
      return NextResponse.json({
        success: true,
        data: {
          requires2FA: true,
          email: login.email,
        },
      });
    }

    if (!login?.accessToken || !login?.user) {
      return NextResponse.json(
        { success: false, message: "A API retornou uma sessão inválida." },
        { status: 502 },
      );
    }

    const response = NextResponse.json({
      success: true,
      data: { user: login.user },
    });
    response.cookies.set("ctrlfarm_session", login.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Number(login.expiresIn) || 86400,
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível conectar à API." },
      { status: 503 },
    );
  }
}
