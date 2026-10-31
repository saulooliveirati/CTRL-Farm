import type { Layout, LayoutItem, ResponsiveLayouts } from "react-grid-layout";

export type GridLayoutItem = LayoutItem;
export type GridLayout = Layout;
export type GridLayouts = ResponsiveLayouts;

export type CardId =
  | "kpi-active-printers"
  | "kpi-production-queue"
  | "kpi-filament-stock"
  | "kpi-efficiency"
  | "printer-fleet-grid"
  | "production-queue-list"
  | "filament-telemetry-chart";

export type CardCategory = "kpi" | "telemetry" | "queue" | "analytics";

export interface CardConfig {
  id: CardId;
  title: string;
  subtitle?: string;
  category: CardCategory;
  visible: boolean;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;

  // Custom properties for specific cards
  settings?: {
    // KPI Active Printers
    targetOccupancy?: number; // e.g. 80 (%)
    showCapacityBar?: boolean;

    // KPI Production Queue
    alertThresholdItems?: number;
    showTodayBadge?: boolean;

    // KPI Filament Stock
    alertThresholdKg?: number; // e.g. 5.0 (kg)
    showWarningBadge?: boolean;

    // KPI Efficiency
    targetEfficiency?: number; // e.g. 90 (%)
    period?: "day" | "week" | "month";

    // Printer Fleet Grid
    filterStatus?: "ALL" | "PRINTING" | "READY" | "PAUSED" | "ERROR";
    showLiveCamera?: boolean;
    showTemps?: boolean;
    streamType?: "webrtc" | "hls" | "fallback";

    // Production Queue List
    maxItems?: number;
    filterPolymer?: "ALL" | "PLA" | "PETG" | "ABS" | "TPU" | "Resina";
    showPriorityTag?: boolean;

    // Filament Telemetry Chart
    chartPeriodDays?: 7 | 14 | 30;
    unit?: "kg" | "g";
    showBreakdown?: boolean;
  };
}

export interface DashboardLayoutState {
  layouts: GridLayouts;
  cardsConfig: Record<CardId, CardConfig>;
}

export const DEFAULT_CARDS_CONFIG: Record<CardId, CardConfig> = {
  "kpi-active-printers": {
    id: "kpi-active-printers",
    title: "Parque de Impressoras",
    subtitle: "Ocupação e Máquinas em Operação",
    category: "kpi",
    visible: true,
    minW: 2,
    minH: 2,
    settings: {
      targetOccupancy: 80,
      showCapacityBar: true,
    },
  },
  "kpi-production-queue": {
    id: "kpi-production-queue",
    title: "Fila de Produção",
    subtitle: "Ordens Pendentes e Novos Pedidos",
    category: "kpi",
    visible: true,
    minW: 2,
    minH: 2,
    settings: {
      alertThresholdItems: 20,
      showTodayBadge: true,
    },
  },
  "kpi-filament-stock": {
    id: "kpi-filament-stock",
    title: "Estoque de Insumos",
    subtitle: "Saldo Disponível e Bobinas Baixas",
    category: "kpi",
    visible: true,
    minW: 2,
    minH: 2,
    settings: {
      alertThresholdKg: 5.0,
      showWarningBadge: true,
    },
  },
  "kpi-efficiency": {
    id: "kpi-efficiency",
    title: "Eficiência Operacional",
    subtitle: "Índice OEE Diário da Farm",
    category: "kpi",
    visible: true,
    minW: 2,
    minH: 2,
    settings: {
      targetEfficiency: 92,
      period: "day",
    },
  },
  "printer-fleet-grid": {
    id: "printer-fleet-grid",
    title: "Telemetria do Parque 3D",
    subtitle: "Monitoramento em Tempo Real das Máquinas",
    category: "telemetry",
    visible: true,
    minW: 4,
    minH: 4,
    settings: {
      filterStatus: "ALL",
      showLiveCamera: true,
      showTemps: true,
      streamType: "webrtc",
    },
  },
  "production-queue-list": {
    id: "production-queue-list",
    title: "Fila de Impressão Prioritária",
    subtitle: "Ordens de Serviço e Cronograma de Entrega",
    category: "queue",
    visible: true,
    minW: 3,
    minH: 4,
    settings: {
      maxItems: 6,
      filterPolymer: "ALL",
      showPriorityTag: true,
    },
  },
  "filament-telemetry-chart": {
    id: "filament-telemetry-chart",
    title: "Consumo Semanal de Filamento",
    subtitle: "Telemetria de Massa Utilizada por Dia",
    category: "analytics",
    visible: true,
    minW: 6,
    minH: 3,
    settings: {
      chartPeriodDays: 7,
      unit: "kg",
      showBreakdown: true,
    },
  },
};

export const DEFAULT_LAYOUTS: GridLayouts = {
  lg: [
    { i: "kpi-active-printers", x: 0, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "kpi-production-queue", x: 3, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "kpi-filament-stock", x: 6, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "kpi-efficiency", x: 9, y: 0, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "printer-fleet-grid", x: 0, y: 2, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "production-queue-list", x: 8, y: 2, w: 4, h: 6, minW: 3, minH: 4 },
    { i: "filament-telemetry-chart", x: 0, y: 8, w: 12, h: 4, minW: 6, minH: 3 },
  ],
  md: [
    { i: "kpi-active-printers", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "kpi-production-queue", x: 4, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "kpi-filament-stock", x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "kpi-efficiency", x: 4, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "printer-fleet-grid", x: 0, y: 4, w: 8, h: 6, minW: 4, minH: 4 },
    { i: "production-queue-list", x: 0, y: 10, w: 8, h: 5, minW: 3, minH: 4 },
    { i: "filament-telemetry-chart", x: 0, y: 15, w: 8, h: 4, minW: 4, minH: 3 },
  ],
  sm: [
    { i: "kpi-active-printers", x: 0, y: 0, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "kpi-production-queue", x: 0, y: 2, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "kpi-filament-stock", x: 0, y: 4, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "kpi-efficiency", x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "printer-fleet-grid", x: 0, y: 8, w: 4, h: 6, minW: 2, minH: 4 },
    { i: "production-queue-list", x: 0, y: 14, w: 4, h: 5, minW: 2, minH: 4 },
    { i: "filament-telemetry-chart", x: 0, y: 19, w: 4, h: 4, minW: 2, minH: 3 },
  ],
};
