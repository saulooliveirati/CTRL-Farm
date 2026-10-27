import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADM_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${ADM_API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const response = NextResponse.json(data);
    response.cookies.set("adm_token", data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: data.expiresIn || 28800,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { message: "Não foi possível conectar ao servidor administrativo." },
      { status: 503 },
    );
  }
}
