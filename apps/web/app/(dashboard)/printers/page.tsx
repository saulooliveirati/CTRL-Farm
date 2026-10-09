import { PrintersManager } from "@/components/printers/printers-manager";
import { getPrintersForPage } from "@/lib/server-printers";
import { getSuppliersForPage } from "@/lib/server-suppliers";

export default async function PrintersPage() {
  const [{ printers, error }, { suppliers }] = await Promise.all([getPrintersForPage(), getSuppliersForPage()]);
  return <PrintersManager initialPrinters={printers} initialSuppliers={suppliers} initialError={error} />;
}
