import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const { search } = new URL(request.url);
  return proxyAuthenticatedApiRequest(`/marketplace/products${search}`, request, "GET");
}
