import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  return proxyAuthenticatedApiRequest(`/products${query}`, request, "GET");
}

export async function POST(request: Request) {
  return proxyAuthenticatedApiRequest("/products", request, "POST");
}
