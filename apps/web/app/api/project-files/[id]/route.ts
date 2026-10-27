import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function DELETE(request: Request, context: RouteContext<"/api/project-files/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(
    `/project-files/${encodeURIComponent(id)}`,
    request,
    "DELETE",
  );
}

export async function PATCH(request: Request, context: RouteContext<"/api/project-files/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/project-files/${encodeURIComponent(id)}`, request, "PATCH");
}

export async function GET(_request: Request, context: RouteContext<"/api/project-files/[id]">) {
  const { id } = await context.params;
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  if (!token)
    return NextResponse.json({ success: false, message: "Sessão ausente." }, { status: 401 });
  try {
    const upstream = await fetch(`${apiUrl}/project-files/${encodeURIComponent(id)}/download`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!upstream.ok) {
      const payload = await upstream
        .json()
        .catch(() => ({ message: "Não foi possível baixar o arquivo." }));
      return NextResponse.json(payload, { status: upstream.status });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition":
          upstream.headers.get("content-disposition") ??
          ((upstream.headers.get("content-type") ?? "").startsWith("image/")
            ? "inline"
            : "attachment"),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Não foi possível conectar à API." },
      { status: 503 },
    );
  }
}
