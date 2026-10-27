import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function PATCH(request: Request, context: RouteContext<"/api/products/[id]/stock">) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(
    `/products/${encodeURIComponent(id)}/stock`,
    request,
    "PATCH",
  );
}
