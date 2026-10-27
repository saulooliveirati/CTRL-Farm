export type WidgetCategory = "metrics" | "charts" | "tables" | "operational";

export type WidgetType =
  | "kpi-stat"
  | "chart-analytics"
  | "data-table"
  | "equipment-fleet"
  | "materials-stock"
  | "production-pipeline"
  | "quick-actions";

export type ChartType = "donut" | "bar-vertical" | "bar-horizontal" | "area-progress";
export type TableFormat = "table" | "compact-list" | "cards-grid";
export type ThemeTone = "emerald" | "cyan" | "amber" | "blue" | "violet" | "rose" | "slate";

export type KpiMetric =
  | "filaments_weight"
  | "filaments_value"
  | "printers_total"
  | "printers_printing"
  | "printers_ready"
  | "production_active"
  | "production_queued"
  | "orders_total"
  | "orders_revenue"
  | "low_stock";

export type ChartMetric =
  | "material_distribution"
  | "printer_status"
  | "filament_brand"
  | "production_status"
  | "orders_status";

export type TableEntity = "production" | "orders" | "printers" | "filaments";

export interface DashboardWidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  subtitle?: string;
  colSpan: 1 | 2 | 3 | 4; // 1 = 25% (normal/pequeno), 2 = 50% (médio), 3 = 75% (largo), 4 = 100% (largura total)
  visible: boolean;

  // Personalização de KPI
  kpiMetric?: KpiMetric;
  customIcon?: string;

  // Personalização de Gráficos (Elementor / Divi style)
  chartType?: ChartType;
  chartMetric?: ChartMetric;

  // Personalização de Tabelas / Listas
  tableFormat?: TableFormat;
  tableEntity?: TableEntity;
  limit?: number; // 3, 5, 8, 10
  sortBy?: string;
  sortOrder?: "asc" | "desc";

  // Estilo e Aparência
  themeTone?: ThemeTone;
  showBorderGlow?: boolean;
}

export interface PresetTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  widgets: DashboardWidgetConfig[];
}
