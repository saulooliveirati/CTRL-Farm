"use client";

import { useState, useEffect, useCallback } from "react";
import type { PrinterRecord } from "@/lib/server-printers";
import type { FilamentRecord } from "@/lib/server-filaments";
import type { ProductionRecord } from "@/lib/server-production";
import type { OrderRecord } from "@/lib/server-orders";
import type { CameraRecord } from "@/lib/server-cameras";
import { DashboardGrid } from "./dashboard-grid";

interface DashboardClientProps {
  initialPrinters: PrinterRecord[];
  initialFilaments: FilamentRecord[];
  initialJobs: ProductionRecord[];
  initialOrders: OrderRecord[];
  initialCameras?: CameraRecord[];
  userId: string;
  isAdmin: boolean;
}

export function DashboardClient({
  initialPrinters,
  initialFilaments,
  initialJobs,
  initialOrders,
  initialCameras = [],
  userId,
  isAdmin,
}: DashboardClientProps) {
  const [printers, setPrinters] = useState<PrinterRecord[]>(initialPrinters);
  const [filaments, setFilaments] = useState<FilamentRecord[]>(initialFilaments);
  const [jobs, setJobs] = useState<ProductionRecord[]>(initialJobs);
  const [orders, setOrders] = useState<OrderRecord[]>(initialOrders);
  const [cameras, setCameras] = useState<CameraRecord[]>(initialCameras);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const handleRefresh = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);

    try {
      const [pRes, fRes, jRes, oRes, cRes] = await Promise.allSettled([
        fetch("/api/printers").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/filaments").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/production").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/orders").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/cameras").then((r) => (r.ok ? r.json() : null)),
      ]);

      if (pRes.status === "fulfilled" && pRes.value) {
        const val = pRes.value.data ?? pRes.value.printers ?? pRes.value;
        if (Array.isArray(val)) setPrinters(val);
      }
      if (fRes.status === "fulfilled" && fRes.value) {
        const val = fRes.value.data ?? fRes.value.filaments ?? fRes.value;
        if (Array.isArray(val)) setFilaments(val);
      }
      if (jRes.status === "fulfilled" && jRes.value) {
        const val = jRes.value.data ?? jRes.value.jobs ?? jRes.value;
        if (Array.isArray(val)) setJobs(val);
      }
      if (oRes.status === "fulfilled" && oRes.value) {
        const val = oRes.value.data ?? oRes.value.orders ?? oRes.value;
        if (Array.isArray(val)) setOrders(val);
      }
      if (cRes.status === "fulfilled" && cRes.value) {
        const val = cRes.value.data ?? cRes.value.cameras ?? cRes.value;
        if (Array.isArray(val)) setCameras(val);
      }

      setLastRefreshedAt(new Date());
    } catch {
      // Ignore background transient network drop
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Background auto-refresh polling every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      void handleRefresh(true);
    }, 30000);
    return () => clearInterval(timer);
  }, [handleRefresh]);

  return (
    <DashboardGrid
      printers={printers}
      filaments={filaments}
      jobs={jobs}
      orders={orders}
      cameras={cameras}
      userId={userId}
      isAdmin={isAdmin}
      onRefresh={() => handleRefresh(false)}
      isRefreshing={isRefreshing}
      lastRefreshedAt={lastRefreshedAt}
    />
  );
}
