import { InventoryMaterialsManager } from "@/components/inventory/inventory-materials-manager";
import { getInventoryMaterialsForPage } from "@/lib/server-inventory-materials";
import { getSuppliersForPage } from "@/lib/server-suppliers";

export default async function MaterialsPage() {
  const [{ materials, error }, { suppliers }] = await Promise.all([getInventoryMaterialsForPage(), getSuppliersForPage()]);
  return <InventoryMaterialsManager initialMaterials={materials} suppliers={suppliers} initialError={error} />;
}
