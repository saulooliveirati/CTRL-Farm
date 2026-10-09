import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/orders/${encodeURIComponent(id)}`, request, "DELETE");
}
