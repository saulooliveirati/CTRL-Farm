import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getCurrentUser } from "@/lib/server-auth";
import { getPrintersForPage } from "@/lib/server-printers";
import { getFilamentsForPage } from "@/lib/server-filaments";
import { getProductionForPage } from "@/lib/server-production";
import { getOrdersForPage } from "@/lib/server-orders";
import { getCamerasForPage } from "@/lib/server-cameras";

export default async function DashboardPage() {
  const [printerData, filamentData, productionData, orderData, cameraData, user] =
    await Promise.all([
      getPrintersForPage(),
      getFilamentsForPage(),
      getProductionForPage(),
      getOrdersForPage(),
      getCamerasForPage().catch(() => ({ cameras: [], error: "" })),
      getCurrentUser(),
    ]);

  return (
    <DashboardView
      printers={printerData.printers ?? []}
      filaments={filamentData.filaments ?? []}
      jobs={productionData.jobs ?? []}
      orders={orderData.orders ?? []}
      cameras={cameraData.cameras ?? []}
      userId={user?.id ?? "default"}
      isAdmin={user?.role === "ADMIN"}
    />
  );
}
