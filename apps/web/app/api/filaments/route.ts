import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/filaments", request, "GET");
}

export async function POST(request: Request) {
  return proxyAuthenticatedApiRequest("/filaments", request, "POST");
}
