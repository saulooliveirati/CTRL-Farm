export type PlanCode =
  | "STARTER"
  | "PROFESSIONAL"
  | "BUSINESS"
  | "ENTERPRISE"
  | "TRIAL"
  | "UNLIMITED_OWNER"
  | "UNLICENSED";

export interface PlanFeatureConfig {
  code: PlanCode;
  name: string;
  allowedRoutes: string[];
  features: {
    dashboard: boolean;
    equipment: boolean;
    inventory: boolean;
    contacts: boolean;
    pricing: boolean;
    marketplace: boolean;
    production: boolean;
    orders: boolean;
    projectFiles: boolean;
    live: boolean;
    aiFarm: boolean;
    permissionsMatrix: boolean;
    consignments: boolean;
  };
}

export const PLAN_CONFIGS: Record<PlanCode, PlanFeatureConfig> = {
  STARTER: {
    code: "STARTER",
    name: "Plano Starter",
    allowedRoutes: [
      "/",
      "/equipment",
      "/printers",
      "/inventory",
      "/filaments",
      "/materials",
      "/pricing",
      "/consignments",
      "/profile",
      "/settings",
    ],
    features: {
      dashboard: true,
      equipment: true,
      inventory: true,
      pricing: true,
      contacts: false,
      marketplace: false,
      production: false,
      orders: false,
      projectFiles: false,
      live: false,
      aiFarm: false,
      permissionsMatrix: false,
      consignments: true,
    },
  },
  PROFESSIONAL: {
    code: "PROFESSIONAL",
    name: "Plano Professional",
    allowedRoutes: [
      "/",
      "/equipment",
      "/printers",
      "/inventory",
      "/filaments",
      "/materials",
      "/pricing",
      "/contacts",
      "/customers",
      "/suppliers",
      "/orders",
      "/marketplace",
      "/project-files",
      "/live",
      "/consignments",
      "/profile",
      "/settings",
    ],
    features: {
      dashboard: true,
      equipment: true,
      inventory: true,
      pricing: true,
      contacts: true,
      marketplace: true,
      orders: true,
      projectFiles: true,
      live: true,
      production: false,
      aiFarm: false,
      permissionsMatrix: false,
      consignments: true,
    },
  },
  TRIAL: {
    code: "TRIAL",
    name: "Plano Trial (7 Dias)",
    allowedRoutes: [
      "/",
      "/equipment",
      "/printers",
      "/inventory",
      "/filaments",
      "/materials",
      "/pricing",
      "/contacts",
      "/customers",
      "/suppliers",
      "/orders",
      "/marketplace",
      "/project-files",
      "/live",
      "/consignments",
      "/profile",
      "/settings",
    ],
    features: {
      dashboard: true,
      equipment: true,
      inventory: true,
      pricing: true,
      contacts: true,
      marketplace: true,
      orders: true,
      projectFiles: true,
      live: true,
      production: false,
      aiFarm: false,
      permissionsMatrix: false,
      consignments: true,
    },
  },
  BUSINESS: {
    code: "BUSINESS",
    name: "Plano Business",
    allowedRoutes: [
      "/",
      "/equipment",
      "/printers",
      "/inventory",
      "/filaments",
      "/materials",
      "/pricing",
      "/contacts",
      "/customers",
      "/suppliers",
      "/orders",
      "/marketplace",
      "/production",
      "/project-files",
      "/live",
      "/ai-farm",
      "/consignments",
      "/profile",
      "/settings",
    ],
    features: {
      dashboard: true,
      equipment: true,
      inventory: true,
      pricing: true,
      contacts: true,
      marketplace: true,
      orders: true,
      projectFiles: true,
      live: true,
      production: true,
      aiFarm: true,
      permissionsMatrix: true,
      consignments: true,
    },
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    name: "Plano Enterprise",
    allowedRoutes: [
      "/",
      "/equipment",
      "/printers",
      "/inventory",
      "/filaments",
      "/materials",
      "/pricing",
      "/contacts",
      "/customers",
      "/suppliers",
      "/orders",
      "/marketplace",
      "/production",
      "/project-files",
      "/live",
      "/ai-farm",
      "/consignments",
      "/profile",
      "/settings",
    ],
    features: {
      dashboard: true,
      equipment: true,
      inventory: true,
      pricing: true,
      contacts: true,
      marketplace: true,
      orders: true,
      projectFiles: true,
      live: true,
      production: true,
      aiFarm: true,
      permissionsMatrix: true,
      consignments: true,
    },
  },
  UNLIMITED_OWNER: {
    code: "UNLIMITED_OWNER",
    name: "Plano Unlimited Owner",
    allowedRoutes: [
      "/",
      "/equipment",
      "/printers",
      "/inventory",
      "/filaments",
      "/materials",
      "/pricing",
      "/contacts",
      "/customers",
      "/suppliers",
      "/orders",
      "/marketplace",
      "/production",
      "/project-files",
      "/live",
      "/ai-farm",
      "/consignments",
      "/profile",
      "/settings",
    ],
    features: {
      dashboard: true,
      equipment: true,
      inventory: true,
      pricing: true,
      contacts: true,
      marketplace: true,
      orders: true,
      projectFiles: true,
      live: true,
      production: true,
      aiFarm: true,
      permissionsMatrix: true,
      consignments: true,
    },
  },
  UNLICENSED: {
    code: "UNLICENSED",
    name: "Não Licenciado",
    allowedRoutes: ["/settings", "/profile"],
    features: {
      dashboard: false,
      equipment: false,
      inventory: false,
      contacts: false,
      pricing: false,
      marketplace: false,
      production: false,
      orders: false,
      projectFiles: false,
      live: false,
      aiFarm: false,
      permissionsMatrix: false,
      consignments: false,
    },
  },
};

/**
 * Normaliza o código do plano retornado pela licença
 */
export function normalizePlanCode(rawCode?: string | null): PlanCode {
  if (!rawCode) return "UNLICENSED";
  const clean = rawCode.trim().toUpperCase();
  if (clean in PLAN_CONFIGS) {
    return clean as PlanCode;
  }
  if (clean.includes("UNLIMITED") || clean.includes("OWNER")) return "UNLIMITED_OWNER";
  if (clean.includes("ENTERPRISE")) return "ENTERPRISE";
  if (clean.includes("BUSINESS")) return "BUSINESS";
  if (clean.includes("PROFESSIONAL") || clean.includes("PRO")) return "PROFESSIONAL";
  if (clean.includes("TRIAL")) return "TRIAL";
  if (clean.includes("STARTER")) return "STARTER";
  return "UNLICENSED";
}

/**
 * Verifica se uma rota está liberada para o plano do usuário
 */
export function isRouteAllowedForPlan(
  pathname: string,
  planCode: PlanCode,
  isLicensed: boolean,
  featuresOverride?: Record<string, any>
): boolean {
  if (!isLicensed) {
    return pathname === "/settings" || pathname === "/profile";
  }

  // Proprietário e Enterprise sempre liberados
  if (planCode === "UNLIMITED_OWNER" || planCode === "ENTERPRISE") {
    return true;
  }

  // Se houver override explícito nas features da chave
  if (featuresOverride) {
    if (pathname.startsWith("/production") && featuresOverride.production === true) return true;
    if (pathname.startsWith("/marketplace") && featuresOverride.marketplace === true) return true;
    if (pathname.startsWith("/contacts") && featuresOverride.customers === true) return true;
    if (pathname.startsWith("/orders") && featuresOverride.orders === true) return true;
  }

  const config = PLAN_CONFIGS[planCode] || PLAN_CONFIGS.UNLICENSED;
  return config.allowedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/**
 * Retorna o plano mínimo necessário para liberar um determinado recurso
 */
export function getRequiredPlanForRoute(pathname: string): string {
  if (pathname.startsWith("/production")) return "Plano Business ou superior";
  if (pathname.startsWith("/ai-farm")) return "Plano Business ou superior";
  if (pathname.startsWith("/marketplace")) return "Plano Professional ou superior";
  if (pathname.startsWith("/contacts") || pathname.startsWith("/customers") || pathname.startsWith("/suppliers")) {
    return "Plano Professional ou superior";
  }
  if (pathname.startsWith("/orders")) return "Plano Professional ou superior";
  if (pathname.startsWith("/project-files")) return "Plano Professional ou superior";
  if (pathname.startsWith("/live")) return "Plano Professional ou superior";
  return "Plano Starter ou superior";
}
