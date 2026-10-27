import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/pricing-estimates/[id]">,
) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(
    `/pricing-estimates/${encodeURIComponent(id)}`,
    request,
    "DELETE",
  );
}
