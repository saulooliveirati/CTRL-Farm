import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function PATCH(request: Request, context: RouteContext<"/api/section-tabs/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/section-tabs/${encodeURIComponent(id)}`, request, "PATCH");
}

export async function DELETE(request: Request, context: RouteContext<"/api/section-tabs/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/section-tabs/${encodeURIComponent(id)}`, request, "DELETE");
}
