import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

export async function GET(request: Request) { return proxyAuthenticatedApiRequest("/suppliers", request, "GET"); }
export async function POST(request: Request) { return proxyAuthenticatedApiRequest("/suppliers", request, "POST"); }
