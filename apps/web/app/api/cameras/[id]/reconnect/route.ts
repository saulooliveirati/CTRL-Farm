import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";
type RouteContext = { params: Promise<{ id: string }> };
export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(
    `/cameras/${encodeURIComponent(id)}/reconnect`,
    request,
    "POST",
  );
}
