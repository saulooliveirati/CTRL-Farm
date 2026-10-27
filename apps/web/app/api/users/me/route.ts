import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/users/me", request, "GET");
}

export async function PATCH(request: Request) {
  return proxyAuthenticatedApiRequest("/users/me", request, "PATCH");
}
