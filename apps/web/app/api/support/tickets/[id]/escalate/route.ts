import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return proxyAuthenticatedApiRequest(`/support/tickets/${id}/escalate`, request, "POST");
}
