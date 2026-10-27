import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyAuthenticatedApiRequest("/marketplace/sync", request, "POST");
}
