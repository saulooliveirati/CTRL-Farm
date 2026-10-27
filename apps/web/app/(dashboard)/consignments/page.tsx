import { ConsignmentsManager } from "@/components/consignments/consignments-manager";
import { getProductsForPage } from "@/lib/server-products";
import { getAuthenticatedUser } from "@/lib/server-auth";

export const metadata = {
  title: "Gestão de Consignados | CTRL-Farm",
  description: "Controle de estoque, vendas, comissões e acertos financeiros de produtos consignados",
};

export default async function ConsignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const [user, { products }, sp] = await Promise.all([
    getAuthenticatedUser(),
    getProductsForPage(),
    searchParams,
  ]);

  return (
    <ConsignmentsManager
      defaultTab={sp?.tab || "dashboard"}
      productsCatalog={products}
      currentUserRole={user?.role}
    />
  );
}
