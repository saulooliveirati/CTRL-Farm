import { proxyAuthenticatedApiRequest } from "@/lib/api-proxy";

type RouteProps = {
  params: Promise<{ path: string[] }>;
};

export async function GET(request: Request, props: RouteProps) {
  const { path } = await props.params;
  return proxyAuthenticatedApiRequest(`/consignments/${path.join("/")}`, request, "GET");
}

export async function POST(request: Request, props: RouteProps) {
  const { path } = await props.params;
  return proxyAuthenticatedApiRequest(`/consignments/${path.join("/")}`, request, "POST");
}

export async function PATCH(request: Request, props: RouteProps) {
  const { path } = await props.params;
  return proxyAuthenticatedApiRequest(`/consignments/${path.join("/")}`, request, "PATCH");
}

export async function DELETE(request: Request, props: RouteProps) {
  const { path } = await props.params;
  return proxyAuthenticatedApiRequest(`/consignments/${path.join("/")}`, request, "DELETE");
}
