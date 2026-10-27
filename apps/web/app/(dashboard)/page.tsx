import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getCurrentUser } from "@/lib/server-auth";
import { getPrintersForPage } from "@/lib/server-printers";
import { getFilamentsForPage } from "@/lib/server-filaments";
import { getProductionForPage } from "@/lib/server-production";
import { getOrdersForPage } from "@/lib/server-orders";

export default async function DashboardPage() {
  const [printerData, filamentData, productionData, orderData, user] = await Promise.all([
    getPrintersForPage(),
    getFilamentsForPage(),
    getProductionForPage(),
    getOrdersForPage(),
    getCurrentUser(),
  ]);
  return (
    <DashboardView
      printers={printerData.printers}
      filaments={filamentData.filaments}
      jobs={productionData.jobs}
      orders={orderData.orders}
      userId={user?.id ?? ""}
      isAdmin={user?.role === "ADMIN"}
    />
  );
}
