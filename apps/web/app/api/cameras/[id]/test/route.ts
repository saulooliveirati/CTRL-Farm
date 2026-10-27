import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(
    `/cameras/${encodeURIComponent(id)}/test`,
    request,
    "GET",
  );
}
