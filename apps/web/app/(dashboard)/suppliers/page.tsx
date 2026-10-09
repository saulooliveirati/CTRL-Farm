import { SuppliersManager } from "@/components/suppliers/suppliers-manager";
import { getSuppliersForPage } from "@/lib/server-suppliers";

export default async function SuppliersPage() {
  const { suppliers, error } = await getSuppliersForPage();
  return <SuppliersManager initialSuppliers={suppliers} initialError={error} />;
}
