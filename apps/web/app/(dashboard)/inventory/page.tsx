import { InventoryHubManager } from "@/components/inventory/inventory-hub-manager";
import { getFilamentsForPage } from "@/lib/server-filaments";
import { getInventoryMaterialsForPage } from "@/lib/server-inventory-materials";
import { getProductsForPage } from "@/lib/server-products";
import { getSuppliersForPage } from "@/lib/server-suppliers";
import { getAuthenticatedUser } from "@/lib/server-auth";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const [
    user,
    { filaments, error: filErr },
    { materials, error: matErr },
    { products, error: prodErr },
    { suppliers },
    sp,
  ] = await Promise.all([
    getAuthenticatedUser(),
    getFilamentsForPage(),
    getInventoryMaterialsForPage(),
    getProductsForPage(),
    getSuppliersForPage(),
    searchParams,
  ]);

  return (
    <InventoryHubManager
      currentUserRole={user?.role}
      initialFilaments={filaments}
      initialMaterials={materials}
      initialProducts={products}
      initialSuppliers={suppliers}
      initialFilamentError={filErr}
      initialMaterialError={matErr}
      initialProductError={prodErr}
      defaultTab={sp?.tab || "filaments"}
    />
  );
}
