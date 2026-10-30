import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/support/tickets/${id}`, request, "GET");
}
