import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/companies/me", request, "GET");
}

export async function PATCH(request: Request) {
  return proxyAuthenticatedApiRequest("/companies/me", request, "PATCH");
}
