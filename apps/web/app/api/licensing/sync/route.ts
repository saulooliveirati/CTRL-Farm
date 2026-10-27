import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyAuthenticatedApiRequest("/licensing/revalidate", request, "POST");
}

export async function GET(request: Request) {
  return proxyAuthenticatedApiRequest("/licensing/status?force=true", request, "GET");
}
