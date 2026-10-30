import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getCurrentUser } from "@/lib/server-auth";
import { getPrintersForPage } from "@/lib/server-printers";
import { getFilamentsForPage } from "@/lib/server-filaments";
import { getProductionForPage } from "@/lib/server-production";
import { getOrdersForPage } from "@/lib/server-orders";
import { getCamerasForPage } from "@/lib/server-cameras";
import { LandingPage } from "@/components/landing/landing-page";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <LandingPage />;
  }

  const [printerData, filamentData, productionData, orderData, cameraData] =
    await Promise.all([
      getPrintersForPage(),
      getFilamentsForPage(),
      getProductionForPage(),
      getOrdersForPage(),
      getCamerasForPage().catch(() => ({ cameras: [], error: "" })),
    ]);

  return (
    <DashboardView
      printers={printerData.printers ?? []}
      filaments={filamentData.filaments ?? []}
      jobs={productionData.jobs ?? []}
      orders={orderData.orders ?? []}
      cameras={cameraData.cameras ?? []}
      userId={user.id}
      isAdmin={user.role === "ADMIN"}
    />
  );
}
