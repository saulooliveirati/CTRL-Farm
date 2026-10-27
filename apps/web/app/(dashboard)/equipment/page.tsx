import { EquipmentHubManager } from "@/components/equipment/equipment-hub-manager";
import { getCamerasForPage } from "@/lib/server-cameras";
import { getFilamentsForPage } from "@/lib/server-filaments";
import { getPrintersForPage } from "@/lib/server-printers";
import { getProductionForPage } from "@/lib/server-production";
import { getSuppliersForPage } from "@/lib/server-suppliers";
import { getAuthenticatedUser } from "@/lib/server-auth";

export default async function EquipmentPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const [user, { printers, error }, { suppliers }, { filaments }, { jobs }, { cameras }, sp] =
    await Promise.all([
      getAuthenticatedUser(),
      getPrintersForPage(),
      getSuppliersForPage(),
      getFilamentsForPage(),
      getProductionForPage(),
      getCamerasForPage().catch(() => ({ cameras: [], error: "" })),
      searchParams,
    ]);

  return (
    <EquipmentHubManager
      currentUserRole={user?.role}
      initialPrinters={printers}
      initialSuppliers={suppliers}
      initialFilaments={filaments}
      initialJobs={jobs}
      initialCameras={cameras ?? []}
      initialError={error}
      defaultTab={sp?.tab || "printers"}
    />
  );
}
