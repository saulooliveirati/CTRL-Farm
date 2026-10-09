import { FilamentsManager } from "@/components/filaments/filaments-manager";
import { getFilamentsForPage } from "@/lib/server-filaments";
import { getSuppliersForPage } from "@/lib/server-suppliers";

export default async function FilamentsPage() {
  const [{ filaments, error }, { suppliers }] = await Promise.all([getFilamentsForPage(), getSuppliersForPage()]);
  return <FilamentsManager initialFilaments={filaments} initialSuppliers={suppliers} initialError={error} />;
}
