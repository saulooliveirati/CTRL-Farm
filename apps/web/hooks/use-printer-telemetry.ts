"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getFirestoreInstance, isFirebaseClientConfigured } from "@/lib/firebase";

export interface LiveTelemetryData {
  printerId: string;
  printerName?: string;
  status?: string;
  bedTemp?: number;
  targetBedTemp?: number;
  nozzleTemp?: number;
  targetNozzleTemp?: number;
  progressPercent?: number;
  currentLayer?: number;
  totalLayers?: number;
  lastSyncAt?: string;
  isRealtimeCloud?: boolean;
}

/**
 * Hook reativo de telemetria em tempo real com Firebase Firestore
 * Se o Firebase estiver ativo, assina atualizações instantâneas via WebSocket/onSnapshot.
 * Caso contrário, opera com polling periódico HTTP.
 */
export function usePrinterLiveTelemetry(
  companyId?: string,
  printerId?: string,
  initialData?: LiveTelemetryData
) {
  const [telemetry, setTelemetry] = useState<LiveTelemetryData | null>(initialData || null);
  const [isCloudActive, setIsCloudActive] = useState<boolean>(false);

  useEffect(() => {
    if (!companyId || !printerId) return;

    // 1. Tenta assinatura reativa em tempo real via Firestore
    if (isFirebaseClientConfigured()) {
      const db = getFirestoreInstance();
      if (db) {
        setIsCloudActive(true);
        const unsubscribe = onSnapshot(
          doc(db, "companies", companyId, "printers", printerId),
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              setTelemetry({
                printerId,
                ...data,
                isRealtimeCloud: true,
              } as LiveTelemetryData);
            }
          },
          (err) => {
            console.warn("[Firebase Hook] Falha ao assinar telemetria no Firestore:", err);
            setIsCloudActive(false);
          }
        );

        return () => unsubscribe();
      }
    }

    // 2. Fallback: Polling HTTP padrão
    setIsCloudActive(false);
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/printers/${printerId}/telemetry`);
        if (res.ok && active) {
          const data = await res.json();
          setTelemetry({
            printerId: printerId!,
            ...data,
            isRealtimeCloud: false,
          });
        }
      } catch {
        // ignore
      }
    }

    poll();
    const interval = setInterval(poll, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [companyId, printerId]);

  return { telemetry, isCloudActive };
}
