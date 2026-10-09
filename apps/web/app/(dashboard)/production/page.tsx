import { ProductionManager } from "@/components/production/production-manager";
import { getFilamentsForPage } from "@/lib/server-filaments";
import { getPrintersForPage } from "@/lib/server-printers";
import { getProductionForPage } from "@/lib/server-production";
import { getOrdersForPage } from "@/lib/server-orders";

export default async function ProductionPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const [printersResult, filamentsResult, productionResult, ordersResult, params] = await Promise.all([
    getPrintersForPage(), getFilamentsForPage(), getProductionForPage(), getOrdersForPage(), searchParams,
  ]);
  return <ProductionManager
    initialPrinters={printersResult.printers}
    initialFilaments={filamentsResult.filaments}
    initialJobs={productionResult.jobs}
    initialOrders={ordersResult.orders}
    initialOrderId={params.order ?? ""}
    initialError={printersResult.error || filamentsResult.error || productionResult.error || ordersResult.error}
  />;
}
