import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADM_API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const targetPath = path.join("/");
  const url = new URL(request.url);
  const targetUrl = `${ADM_API_URL}/api/v1/${targetPath}${url.search}`;

  const cookieStore = await cookies();
  const token =
    cookieStore.get("adm_token")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let body: string | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    body = await request.text();
    headers["Content-Type"] = "application/json";
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { message: "Falha na comunicação com o backend administrativo." },
      { status: 503 },
    );
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
