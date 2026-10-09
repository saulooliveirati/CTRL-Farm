import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/production", request, "GET");
}

export async function POST(request: Request) {
  return proxyAuthenticatedApiRequest("/production", request, "POST");
}
