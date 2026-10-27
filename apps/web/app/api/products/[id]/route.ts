import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request, context: RouteContext<"/api/products/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/products/${encodeURIComponent(id)}`, request, "GET");
}

export async function PATCH(request: Request, context: RouteContext<"/api/products/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/products/${encodeURIComponent(id)}`, request, "PATCH");
}

export async function DELETE(request: Request, context: RouteContext<"/api/products/[id]">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/products/${encodeURIComponent(id)}`, request, "DELETE");
}
