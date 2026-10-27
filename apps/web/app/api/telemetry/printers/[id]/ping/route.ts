import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return proxyAuthenticatedApiRequest(`/telemetry/printers/${id}/ping`, request, "POST");
}
