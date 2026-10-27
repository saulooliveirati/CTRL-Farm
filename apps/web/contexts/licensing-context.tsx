"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  type PlanCode,
  normalizePlanCode,
  isRouteAllowedForPlan,
  PLAN_CONFIGS,
} from "@/lib/plan-permissions";

export interface LicensingState {
  isLicensed: boolean;
  isSuspended: boolean;
  mode: "ONLINE" | "OFFLINE_CACHE";
  status:
    | "ACTIVE"
    | "EXPIRED"
    | "REVOKED"
    | "TAMPERED"
    | "UNLICENSED"
    | "SUSPENDED"
    | "SUSPENSO"
    | "PAUSED"
    | "PAUSADO"
    | "CANCELLED"
    | "CANCELADO";
  message: string;
  daysRemaining: number;
  planCode: PlanCode;
  planName: string;
  activationKey: string | null;
  features: Record<string, any>;
  expiresAt: string | null;
  loading: boolean;
  refreshLicensing: () => Promise<void>;
  verifyPayment: () => Promise<boolean>;
  isRouteAllowed: (pathname: string) => boolean;
  hasFeature: (featureKey: string) => boolean;
  isActivationModalOpen: boolean;
  setIsActivationModalOpen: (open: boolean) => void;
}

const LicensingContext = createContext<LicensingState | undefined>(undefined);

export function LicensingProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: any;
}) {
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [data, setData] = useState<any>(initialData || null);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState<boolean>(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/licensing/status", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data ?? json;
        setData(payload);
      } else {
        setData({
          isLicensed: false,
          isSuspended: false,
          status: "UNLICENSED",
          message: "Falha ao obter status de licença.",
          daysRemaining: 0,
          license: null,
        });
      }
    } catch {
      setData({
        isLicensed: false,
        isSuspended: false,
        status: "UNLICENSED",
        message: "Erro de conexão ao verificar licença.",
        daysRemaining: 0,
        license: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyPayment = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch("/api/licensing/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const payload = json.data ?? json;
        setData(payload);
        return Boolean(payload?.isLicensed && payload?.status === "ACTIVE");
      }
    } catch (e) {
      console.error("Erro ao verificar pagamento:", e);
    }
    return false;
  }, []);

  useEffect(() => {
    if (!initialData) {
      fetchStatus();
    }
  }, [initialData, fetchStatus]);

  const isSuspended = Boolean(
    data?.isSuspended ||
      data?.isLocked ||
      data?.status === "SUSPENDED" ||
      data?.status === "SUSPENSO" ||
      data?.status === "PAUSED" ||
      data?.status === "PAUSADO" ||
      data?.status === "CANCELLED" ||
      data?.status === "CANCELADO" ||
      data?.status === "REVOKED"
  );
  const isLicensed = Boolean(!isSuspended && data?.isLicensed && data?.status === "ACTIVE");
  const rawCode = data?.license?.plan?.code || data?.license?.planCode;
  const planCode = isLicensed ? normalizePlanCode(rawCode) : "UNLICENSED";
  const planName = data?.license?.plan?.name || PLAN_CONFIGS[planCode]?.name || "Sem Licença";
  const activationKey = data?.license?.activationKey || null;
  const features = data?.license?.features || {};
  const expiresAt = data?.license?.expiresAt || null;
  const daysRemaining = Number(data?.daysRemaining || 0);

  // Polling automático a cada 15 minutos quando estiver na tela de pop-up bloqueante para validar e liberar com mais agilidade
  useEffect(() => {
    if (!isSuspended) return;

    const interval = setInterval(() => {
      verifyPayment();
    }, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isSuspended, verifyPayment]);

  // Verificação periódica leve a cada 60s em segundo plano para refletir suspensões imediatas enviadas pelo ADM Gerente
  useEffect(() => {
    if (isSuspended) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [isSuspended, fetchStatus]);

  const isRouteAllowed = useCallback(
    (pathname: string) => {
      if (isSuspended) return false;
      return isRouteAllowedForPlan(pathname, planCode, isLicensed, features);
    },
    [isSuspended, planCode, isLicensed, features]
  );

  const hasFeature = useCallback(
    (featureKey: string) => {
      if (isSuspended || !isLicensed) return false;
      if (planCode === "UNLIMITED_OWNER" || planCode === "ENTERPRISE") return true;
      if (features?.[featureKey] !== undefined) return Boolean(features[featureKey]);
      const config = PLAN_CONFIGS[planCode];
      return Boolean(config?.features?.[featureKey as keyof typeof config.features]);
    },
    [isSuspended, isLicensed, planCode, features]
  );

  return (
    <LicensingContext.Provider
      value={{
        isLicensed,
        isSuspended,
        mode: data?.mode || "ONLINE",
        status: data?.status || "UNLICENSED",
        message: data?.message || "",
        daysRemaining,
        planCode,
        planName,
        activationKey,
        features,
        expiresAt,
        loading,
        refreshLicensing: fetchStatus,
        verifyPayment,
        isRouteAllowed,
        hasFeature,
        isActivationModalOpen,
        setIsActivationModalOpen,
      }}
    >
      {children}
    </LicensingContext.Provider>
  );
}

export function useLicensing() {
  const context = useContext(LicensingContext);
  if (!context) {
    throw new Error("useLicensing deve ser utilizado dentro de um LicensingProvider");
  }
  return context;
}
