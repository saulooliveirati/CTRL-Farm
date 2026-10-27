import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/firebase/status", request, "GET");
}
