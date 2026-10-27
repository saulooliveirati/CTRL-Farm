import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyAuthenticatedApiRequest("/firebase/sync/all", request, "POST");
}
