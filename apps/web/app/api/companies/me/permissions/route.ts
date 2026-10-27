import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/companies/me/permissions", request, "GET");
}

export async function PUT(request: Request) {
  return proxyAuthenticatedApiRequest("/companies/me/permissions", request, "PUT");
}
