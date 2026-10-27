import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/marketplace/metrics", request, "GET");
}
