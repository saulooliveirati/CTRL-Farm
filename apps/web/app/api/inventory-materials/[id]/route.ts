import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/inventory-materials/${encodeURIComponent(id)}`, request, "PATCH");
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/inventory-materials/${encodeURIComponent(id)}`, request, "DELETE");
}
