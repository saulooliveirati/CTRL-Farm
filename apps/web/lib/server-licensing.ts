import "server-only";

import { cookies } from "next/headers";

export type LicensePlanDetails = {
  code: string;
  name: string;
};

export type LicenseFeatures = {
  users?: number;
  companies?: number;
  printers?: number;
  products?: boolean;
  filaments?: boolean;
  basicStock?: boolean;
  basicCosts?: boolean;
  simpleDashboard?: boolean;
  orders?: boolean;
  customers?: boolean;
  basicFinancial?: boolean;
  reports?: boolean;
  marketplace?: boolean;
  production?: boolean;
  permissions?: boolean;
  multiCompany?: boolean;
  api?: boolean;
  advancedReports?: boolean;
  financialComplete?: boolean;
  allResources?: boolean;
  [key: string]: any;
};

export type LicensingStatusData = {
  isLicensed: boolean;
  isSuspended?: boolean;
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
  license: {
    activationKey: string;
    plan: LicensePlanDetails;
    features: LicenseFeatures;
    expiresAt: string;
    lastValidatedAt?: string | null;
    autoUpdate: boolean;
    updateChannel: string;
  } | null;
};

export type UpdateCheckData = {
  updateAvailable: boolean;
  currentClientVersion?: string;
  latestVersion?: string;
  title?: string;
  description?: string;
  releaseDate?: string;
  isMandatory?: boolean;
  isCritical?: boolean;
  changelog?: string[];
  downloadUrl?: string | null;
  checksumSha256?: string | null;
  error?: string;
  message?: string;
};

const apiUrl = process.env.CTRL_FARM_API_URL ?? "http://localhost:3001";

export async function getLicensingStatus(): Promise<LicensingStatusData> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  try {
    const res = await fetch(`${apiUrl}/licensing/status`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        isLicensed: false,
        mode: "OFFLINE_CACHE",
        status: "UNLICENSED",
        message: "Não foi possível verificar a licença junto ao servidor.",
        daysRemaining: 0,
        license: null,
      };
    }

    const payload = await res.json();
    return payload.data ?? payload;
  } catch {
    return {
      isLicensed: false,
      mode: "OFFLINE_CACHE",
      status: "UNLICENSED",
      message: "Falha de rede ao verificar status de licenciamento.",
      daysRemaining: 0,
      license: null,
    };
  }
}

export async function revalidateLicensing(): Promise<LicensingStatusData> {
  const token = (await cookies()).get("ctrlfarm_session")?.value;
  try {
    const res = await fetch(`${apiUrl}/licensing/revalidate`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        isLicensed: false,
        mode: "ONLINE",
        status: "UNLICENSED",
        message: "Falha ao revalidar licença com o servidor.",
        daysRemaining: 0,
        license: null,
      };
    }

    const payload = await res.json();
    return payload.data ?? payload;
  } catch {
    return {
      isLicensed: false,
      mode: "OFFLINE_CACHE",
      status: "UNLICENSED",
      message: "Falha de conexão com o servidor.",
      daysRemaining: 0,
      license: null,
    };
  }
}

export async function checkSoftwareUpdates(clientVersion: string = "v2.5.0"): Promise<UpdateCheckData> {
  try {
    const res = await fetch(`${apiUrl}/licensing/updates?version=${encodeURIComponent(clientVersion)}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      return {
        updateAvailable: false,
        message: "Servidor de atualizações indisponível no momento.",
      };
    }

    const payload = await res.json();
    return payload.data ?? payload;
  } catch (err: any) {
    return {
      updateAvailable: false,
      error: err.message,
      message: "Não foi possível conectar ao servidor de atualizações.",
    };
  }
}
