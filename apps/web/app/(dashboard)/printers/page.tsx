import { PrintersManager } from "@/components/printers/printers-manager";
import { getPrintersForPage } from "@/lib/server-printers";

export default async function PrintersPage() {
  const { printers, error } = await getPrintersForPage();
  return <PrintersManager initialPrinters={printers} initialError={error} />;
}
