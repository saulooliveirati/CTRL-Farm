import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function POST(request: Request) {
  return proxyAuthenticatedApiRequest("/project-files/parse-link", request, "POST");
}
