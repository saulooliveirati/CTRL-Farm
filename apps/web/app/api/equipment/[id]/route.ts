import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request, context: RouteContext<"/api/equipment/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/equipment/${encodeURIComponent(id)}`, request, "GET");
}

export async function PATCH(request: Request, context: RouteContext<"/api/equipment/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/equipment/${encodeURIComponent(id)}`, request, "PATCH");
}

export async function DELETE(request: Request, context: RouteContext<"/api/equipment/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/equipment/${encodeURIComponent(id)}`, request, "DELETE");
}
