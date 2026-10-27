import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyAuthenticatedApiRequest("/auth/2fa/backup-codes", request, "POST");
}
