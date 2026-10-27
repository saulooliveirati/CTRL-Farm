import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function PATCH(request: Request) {
  return proxyAuthenticatedApiRequest("/section-tabs/reorder", request, "PATCH");
}
