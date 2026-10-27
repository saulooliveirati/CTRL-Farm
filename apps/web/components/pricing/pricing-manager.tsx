"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type Filament = {
  id: string;
  material: string;
  brand: string;
  color: string;
  initialWeightG: number;
  currentWeightG: number;
  price: string | number | null;
};
type Printer = { id: string; name: string; status: string };
type Supply = {
  id: string;
  name: string;
  unit: string;
  unitCost: string | number | null;
  currentQuantity: string | number;
};
type FilamentLine = {
  key: string;
  stockId: string;
  material: string;
  rollPrice: string;
  rollWeightG: string;
  consumptionG: string;
};
type SupplyLine = {
  key: string;
  inventoryMaterialId: string;
  name: string;
  unit: string;
  quantity: string;
  unitCost: string;
};
type QuoteInput = {
  productName: string;
  printerId: string;
  marketplace: string;
  printHours: number;
  printMinutes: number;
  powerKw: number;
  electricityPrice: number;
  machineRatePerHour: number;
  laborRatePerHour: number;
  marginType: "MARGIN" | "MARKUP" | "FIXED_PRICE";
  marginPercent: number;
  fixedPrice: number;
  paymentOptions: string[];
  wastePercent: number;
  marketplaceFeePercent: number;
  paymentFeePercent: number;
  taxPercent: number;
  filamentLines: {
    stockId?: string;
    material: string;
    rollPrice: number;
    rollWeightG: number;
    consumptionG: number;
  }[];
  supplyLines: {
    inventoryMaterialId?: string;
    name: string;
    unit: string;
    quantity: number;
    unitCost: number;
  }[];
};
type Quote = {
  id: string;
  productName: string;
  printerId: string | null;
  printerName: string | null;
  printer: { id: string; name: string } | null;
  marketplace: string | null;
  printDurationMinutes: number;
  powerKw: string | number;
  electricityPrice: string | number;
  machineRatePerHour: string | number;
  laborRatePerHour: string | number;
  marginType: "MARGIN" | "MARKUP" | "FIXED_PRICE";
  marginPercent: string | number;
  fixedPrice: string | number;
  paymentOptions: unknown;
  wastePercent: string | number;
  marketplaceFeePercent: string | number;
  paymentFeePercent: string | number;
  taxPercent: string | number;
  filamentLines: unknown;
  supplyLines: unknown;
  materialCost: string | number;
  machineCost: string | number;
  laborCost: string | number;
  additionalCost: string | number;
  totalCost: string | number;
  suggestedPrice: string | number;
  estimatedProfit: string | number;
  createdAt: string;
};
type FormState = Omit<
  QuoteInput,
  | "printHours"
  | "printMinutes"
  | "powerKw"
  | "electricityPrice"
  | "machineRatePerHour"
  | "laborRatePerHour"
  | "marginPercent"
  | "fixedPrice"
  | "wastePercent"
  | "marketplaceFeePercent"
  | "paymentFeePercent"
  | "taxPercent"
  | "filamentLines"
  | "supplyLines"
> & {
  printHours: string;
  printMinutes: string;
  powerKw: string;
  electricityPrice: string;
  machineRatePerHour: string;
  laborRatePerHour: string;
  marginPercent: string;
  wastePercent: string;
  marketplaceFeePercent: string;
  paymentFeePercent: string;
  taxPercent: string;
  fixedPrice: string;
  paymentOptions: string[];
  filamentLines: FilamentLine[];
  supplyLines: SupplyLine[];
};

const blankFilament = (key = "filament-initial"): FilamentLine => ({
  key,
  stockId: "",
  material: "",
  rollPrice: "0",
  rollWeightG: "1000",
  consumptionG: "0",
});
const blankSupply = (key = "supply-initial"): SupplyLine => ({
  key,
  inventoryMaterialId: "",
  name: "",
  unit: "un",
  quantity: "1",
  unitCost: "0",
});
const initialForm: FormState = {
  productName: "",
  printerId: "",
  marketplace: "",
  printHours: "0",
  printMinutes: "0",
  powerKw: "0.35",
  electricityPrice: "1",
  machineRatePerHour: "1.5",
  laborRatePerHour: "2.5",
  marginType: "MARGIN",
  marginPercent: "30",
  fixedPrice: "0",
  paymentOptions: ["Dinheiro", "Pix", "Débito", "Crédito"],
  wastePercent: "5",
  marketplaceFeePercent: "0",
  paymentFeePercent: "0",
  taxPercent: "0",
  filamentLines: [blankFilament()],
  supplyLines: [],
};

const value = (input: string | number | null | undefined) => Number(input ?? 0) || 0;
const money = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
const currency = (amount: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
const feeTotal = (quote: QuoteInput) =>
  quote.marketplaceFeePercent + quote.paymentFeePercent + quote.taxPercent;

function calculate(quote: QuoteInput) {
  const filamentCost = money(
    quote.filamentLines.reduce(
      (sum, line) => sum + money((line.rollPrice * line.consumptionG) / line.rollWeightG),
      0,
    ),
  );
  const suppliesCost = money(
    quote.supplyLines.reduce((sum, line) => sum + money(line.quantity * line.unitCost), 0),
  );
  const durationHours = (quote.printHours * 60 + quote.printMinutes) / 60;
  const electricityCost = quote.powerKw * durationHours * quote.electricityPrice;
  const machineDepreciation = durationHours * quote.machineRatePerHour;
  const machineCost = money(electricityCost + machineDepreciation);
  const laborCost = money(durationHours * quote.laborRatePerHour);
  const wasteCost = money((filamentCost * quote.wastePercent) / 100);
  const cost = money(filamentCost + wasteCost + suppliesCost + machineCost + laborCost);
  const deductions = feeTotal(quote) + (quote.marginType === "MARGIN" ? quote.marginPercent : 0);
  const valid =
    cost > 0 && (quote.marginType === "FIXED_PRICE" ? quote.fixedPrice > 0 : deductions < 100);
  const rawPrice = !valid
    ? 0
    : quote.marginType === "FIXED_PRICE"
      ? quote.fixedPrice
      : quote.marginType === "MARGIN"
        ? cost / (1 - deductions / 100)
        : (cost * (1 + quote.marginPercent / 100)) / (1 - feeTotal(quote) / 100);
  const suggestedPrice = valid
    ? quote.marginType === "FIXED_PRICE"
      ? money(rawPrice)
      : Math.ceil(rawPrice * 100 - 1e-9) / 100
    : 0;
  const feeCost = money((suggestedPrice * feeTotal(quote)) / 100);
  const profit = money(suggestedPrice - feeCost - cost);
  return {
    filamentCost,
    wasteCost,
    suppliesCost,
    electricityCost: money(electricityCost),
    machineDepreciation: money(machineDepreciation),
    machineCost,
    laborCost,
    feeCost,
    cost,
    suggestedPrice,
    profit,
    durationHours,
    valid,
  };
}

function quoteFromForm(form: FormState): QuoteInput {
  return {
    productName: form.productName.trim(),
    printerId: form.printerId,
    marketplace: form.marketplace,
    printHours: value(form.printHours),
    printMinutes: value(form.printMinutes),
    powerKw: value(form.powerKw),
    electricityPrice: value(form.electricityPrice),
    machineRatePerHour: value(form.machineRatePerHour),
    laborRatePerHour: value(form.laborRatePerHour),
    marginType: form.marginType,
    marginPercent: value(form.marginPercent),
    fixedPrice: value(form.fixedPrice),
    paymentOptions: form.paymentOptions,
    wastePercent: value(form.wastePercent),
    marketplaceFeePercent: value(form.marketplaceFeePercent),
    paymentFeePercent: value(form.paymentFeePercent),
    taxPercent: value(form.taxPercent),
    filamentLines: form.filamentLines
      .filter(
        (line) =>
          line.material.trim() && value(line.rollWeightG) > 0 && value(line.consumptionG) > 0,
      )
      .map((line) => ({
        ...(line.stockId ? { stockId: line.stockId } : {}),
        material: line.material.trim(),
        rollPrice: value(line.rollPrice),
        rollWeightG: value(line.rollWeightG),
        consumptionG: value(line.consumptionG),
      })),
    supplyLines: form.supplyLines
      .filter((line) => line.name.trim() && value(line.quantity) > 0)
      .map((line) => ({
        ...(line.inventoryMaterialId ? { inventoryMaterialId: line.inventoryMaterialId } : {}),
        name: line.name.trim(),
        unit: line.unit,
        quantity: value(line.quantity),
        unitCost: value(line.unitCost),
      })),
  };
}

function toForm(quote: QuoteInput): FormState {
  return {
    ...quote,
    printHours: String(quote.printHours),
    printMinutes: String(quote.printMinutes),
    powerKw: String(quote.powerKw),
    electricityPrice: String(quote.electricityPrice),
    machineRatePerHour: String(quote.machineRatePerHour),
    laborRatePerHour: String(quote.laborRatePerHour),
    marginPercent: String(quote.marginPercent),
    fixedPrice: String(quote.fixedPrice),
    wastePercent: String(quote.wastePercent),
    marketplaceFeePercent: String(quote.marketplaceFeePercent),
    paymentFeePercent: String(quote.paymentFeePercent),
    taxPercent: String(quote.taxPercent),
    filamentLines: quote.filamentLines.length
      ? quote.filamentLines.map((line, index) => ({
          key: `filament-${index}-${Date.now()}`,
          stockId: line.stockId ?? "",
          material: line.material,
          rollPrice: String(line.rollPrice),
          rollWeightG: String(line.rollWeightG),
          consumptionG: String(line.consumptionG),
        }))
      : [blankFilament()],
    supplyLines: quote.supplyLines.map((line, index) => ({
      key: `supply-${index}-${Date.now()}`,
      inventoryMaterialId: line.inventoryMaterialId ?? "",
      name: line.name,
      unit: line.unit,
      quantity: String(line.quantity),
      unitCost: String(line.unitCost),
    })),
  };
}

function quoteFromEstimate(estimate: Quote): QuoteInput {
  const savedFilaments = Array.isArray(estimate.filamentLines) ? estimate.filamentLines : [];
  const savedSupplies = Array.isArray(estimate.supplyLines) ? estimate.supplyLines : [];
  const legacyFilamentCost = Math.max(
    0,
    value(estimate.totalCost) -
      value(estimate.machineCost) -
      value(estimate.laborCost) -
      value(estimate.additionalCost),
  );
  const legacyOperationalCost = Math.max(0, value(estimate.totalCost) - legacyFilamentCost);
  return {
    productName: estimate.productName,
    printerId: estimate.printerId ?? "",
    marketplace: estimate.marketplace ?? "",
    printHours: Math.floor(estimate.printDurationMinutes / 60),
    printMinutes: estimate.printDurationMinutes % 60,
    powerKw: value(estimate.powerKw),
    electricityPrice: value(estimate.electricityPrice),
    machineRatePerHour: value(estimate.machineRatePerHour),
    laborRatePerHour: value(estimate.laborRatePerHour),
    marginType: estimate.marginType,
    marginPercent: value(estimate.marginPercent),
    fixedPrice: value(estimate.fixedPrice),
    paymentOptions: Array.isArray(estimate.paymentOptions)
      ? estimate.paymentOptions.filter((item): item is string => typeof item === "string")
      : [],
    wastePercent: value(estimate.wastePercent),
    marketplaceFeePercent: value(estimate.marketplaceFeePercent),
    paymentFeePercent: value(estimate.paymentFeePercent),
    taxPercent: value(estimate.taxPercent),
    filamentLines: savedFilaments.length
      ? savedFilaments
      : legacyFilamentCost > 0
        ? [
            {
              material: "Material e perdas do orçamento original",
              rollPrice: legacyFilamentCost,
              rollWeightG: 1,
              consumptionG: 1,
            },
          ]
        : [],
    supplyLines: savedSupplies.length
      ? savedSupplies
      : legacyOperationalCost > 0
        ? [
            {
              name: "Custos operacionais do orçamento original",
              unit: "un",
              quantity: 1,
              unitCost: legacyOperationalCost,
            },
          ]
        : [],
    ...(!savedFilaments.length && !savedSupplies.length ? { wastePercent: 0 } : {}),
  };
}

function exportQuote(quote: QuoteInput, printerName: string, calculations = calculate(quote)) {
  const escapeHtml = (text: string) =>
    text.replace(
      /[&<>"']/g,
      (char) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char,
    );
  const lineRows = quote.filamentLines
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.material)}</td><td>${line.consumptionG} g</td><td>${currency((line.rollPrice / line.rollWeightG) * line.consumptionG)}</td></tr>`,
    )
    .join("");
  const supplyRows = quote.supplyLines
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.name)}</td><td>${line.quantity} ${escapeHtml(line.unit)}</td><td>${currency(line.quantity * line.unitCost)}</td></tr>`,
    )
    .join("");
  const content = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Orçamento - ${escapeHtml(quote.productName)}</title><style>body{font:15px Arial,sans-serif;color:#172033;max-width:820px;margin:40px auto;padding:0 24px}h1{margin-bottom:4px}h2{margin-top:28px;border-bottom:1px solid #d5dce7;padding-bottom:8px}small,.muted{color:#64748b}table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:10px;border-bottom:1px solid #e2e8f0}.total{background:#effcf6;padding:18px;border-radius:12px;color:#087a55}.price{font-size:32px;font-weight:700}button{padding:10px 16px;border:0;border-radius:8px;background:#10b981;color:white;cursor:pointer}@media print{button{display:none}}</style><body><small>CTRL+FARM · ORÇAMENTO DE PRODUÇÃO</small><h1>${escapeHtml(quote.productName)}</h1><p class="muted">${escapeHtml(printerName || "Impressora não selecionada")} · ${quote.printHours}h ${quote.printMinutes}min · ${new Date().toLocaleDateString("pt-BR")}</p><h2>Materiais e insumos</h2><table><thead><tr><th>Item</th><th>Consumo</th><th>Custo</th></tr></thead><tbody>${lineRows}${supplyRows}</tbody></table><h2>Custos operacionais</h2><table><tbody><tr><td>Energia (${quote.powerKw} kW × ${currency(quote.electricityPrice)}/kWh)</td><td>${currency(calculations.electricityCost)}</td></tr><tr><td>Depreciação da máquina</td><td>${currency(calculations.machineDepreciation)}</td></tr><tr><td>Mão de obra</td><td>${currency(calculations.laborCost)}</td></tr><tr><td>Perdas de material</td><td>${quote.wastePercent}%</td></tr><tr><td>Taxas e impostos</td><td>${feeTotal(quote)}%</td></tr></tbody></table><div class="total"><div>Custo total de produção</div><strong>${currency(calculations.cost)}</strong><div style="margin-top:16px">Preço ${quote.marginType === "FIXED_PRICE" ? "definido" : "sugerido"}</div><div class="price">${currency(calculations.suggestedPrice)}</div><div>Lucro estimado: ${currency(calculations.profit)} · ${quote.marginType === "FIXED_PRICE" ? "Preço fixo" : `${quote.marginType === "MARGIN" ? "Margem" : "Markup"} ${quote.marginPercent}%`}</div><div>Pagamentos: ${escapeHtml(quote.paymentOptions.join(", ") || "não informados")}</div></div><p class="muted">Estimativa baseada nos custos e percentuais informados. Confirme tarifas e tributos vigentes antes da venda.</p><p><button onclick="window.print()">Imprimir / Salvar PDF</button></p></body></html>`;
  const blob = new Blob([content], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `orcamento-${
    quote.productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-|-$/g, "") || "produto"
  }.html`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Field({
  label,
  hint,
  value: currentValue,
  onChange,
  min = 0,
  max,
  step = "0.01",
  type = "number",
  placeholder,
  required = false,
  minLength,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-xs font-medium text-slate-200">
      {label}
      <input
        type={type}
        min={type === "number" ? min : undefined}
        max={max}
        minLength={minLength}
        required={required}
        step={step}
        value={currentValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 min-w-0 rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15"
      />
      {hint && <span className="text-[11px] font-normal leading-4 text-slate-400">{hint}</span>}
    </label>
  );
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-[#0e1524] p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function PricingManager() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [estimates, setEstimates] = useState<Quote[]>([]);
  const [filaments, setFilaments] = useState<Filament[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [tab, setTab] = useState<"calculator" | "saved">("calculator");
  const [calculatorMode, setCalculatorMode] = useState<"full" | "express">("full");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [preview, setPreview] = useState<QuoteInput | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/pricing-estimates"),
      fetch("/api/filaments"),
      fetch("/api/printers"),
      fetch("/api/inventory-materials"),
    ])
      .then(async ([quoteResponse, filamentResponse, printerResponse, supplyResponse]) => {
        const [quoteResult, filamentResult, printerResult, supplyResult] = await Promise.all([
          quoteResponse.json(),
          filamentResponse.json(),
          printerResponse.json(),
          supplyResponse.json(),
        ]);
        if (!quoteResponse.ok)
          throw new Error(quoteResult.message ?? "Não foi possível carregar os orçamentos.");
        setEstimates(quoteResult.data ?? []);
        if (filamentResponse.ok) setFilaments(filamentResult.data ?? []);
        if (printerResponse.ok) setPrinters(printerResult.data ?? []);
        if (supplyResponse.ok) setSupplies(supplyResult.data ?? []);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "Falha ao carregar os dados."),
      )
      .finally(() => setLoading(false));
  }, []);

  const quote = useMemo(() => quoteFromForm(form), [form]);
  const calculation = useMemo(() => calculate(quote), [quote]);
  const update = (field: keyof FormState, nextValue: string) =>
    setForm((current) => ({ ...current, [field]: nextValue }));

  function updateFilament(key: string, field: keyof FilamentLine, nextValue: string) {
    setForm((current) => ({
      ...current,
      filamentLines: current.filamentLines.map((line) =>
        line.key === key ? { ...line, [field]: nextValue } : line,
      ),
    }));
  }
  function selectFilament(key: string, stockId: string) {
    const selected = filaments.find((item) => item.id === stockId);
    setForm((current) => ({
      ...current,
      filamentLines: current.filamentLines.map((line) =>
        line.key === key
          ? selected
            ? {
                ...line,
                stockId,
                material: `${selected.material} · ${selected.brand} · ${selected.color}`,
                rollPrice: String(value(selected.price)),
                rollWeightG: String(selected.initialWeightG),
              }
            : { ...line, stockId: "" }
          : line,
      ),
    }));
  }
  function updateSupply(key: string, field: keyof SupplyLine, nextValue: string) {
    setForm((current) => ({
      ...current,
      supplyLines: current.supplyLines.map((line) =>
        line.key === key ? { ...line, [field]: nextValue } : line,
      ),
    }));
  }
  function selectSupply(key: string, inventoryMaterialId: string) {
    const selected = supplies.find((item) => item.id === inventoryMaterialId);
    setForm((current) => ({
      ...current,
      supplyLines: current.supplyLines.map((line) =>
        line.key === key
          ? selected
            ? {
                ...line,
                inventoryMaterialId,
                name: selected.name,
                unit: selected.unit,
                unitCost: String(value(selected.unitCost)),
              }
            : { ...line, inventoryMaterialId: "" }
          : line,
      ),
    }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    if (!calculation.valid) {
      setError("Informe pelo menos um custo e mantenha as taxas e a margem válidas.");
      setSaving(false);
      return;
    }
    try {
      const response = await fetch("/api/pricing-estimates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quote),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Não foi possível salvar o orçamento.");
      setEstimates((items) => [result.data, ...items]);
      setForm(initialForm);
      setMarketplaceOpen(false);
      setTab("saved");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao calcular o orçamento.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Excluir este orçamento salvo?")) return;
    const response = await fetch(`/api/pricing-estimates/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.message ?? "Não foi possível excluir o orçamento.");
      return;
    }
    setEstimates((items) => items.filter((item) => item.id !== id));
  }

  const summaryRows = [
    ["Tempo de impressão", `${value(form.printHours)}h ${value(form.printMinutes)}min`],
    ["Custo de filamento", currency(calculation.filamentCost)],
    ["Perda estimada", currency(calculation.wasteCost)],
    ["Insumos e extras", currency(calculation.suppliesCost)],
    ["Energia", currency(calculation.electricityCost)],
    ["Máquina / depreciação", currency(calculation.machineDepreciation)],
    ["Mão de obra", currency(calculation.laborCost)],
    ["Taxas e impostos", `${currency(calculation.feeCost)} · ${feeTotal(quote).toFixed(2)}%`],
  ];

  return (
    <div className="-m-3 min-h-full bg-[#080d18] px-4 py-6 text-slate-100 sm:-m-5 sm:px-6 xl:-m-7 xl:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-400">
            Custos & Formação de Preço
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">Calculadora</h1>
          <p className="mt-1 text-sm text-slate-400">
            Calcule custo de produção, filamentos, insumos, margem e preço de venda com taxas de
            marketplace.
          </p>
        </header>
        <div className="flex flex-wrap gap-2">
          <div
            className="inline-flex rounded-xl border border-slate-800 bg-[#0e1524] p-1"
            role="tablist"
            aria-label="Calculadora de precificação 3D"
          >
            <button
              role="tab"
              aria-selected={tab === "calculator"}
              onClick={() => setTab("calculator")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "calculator" ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}
            >
              Calculadora
            </button>
            <button
              role="tab"
              aria-selected={tab === "saved"}
              onClick={() => setTab("saved")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "saved" ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:bg-slate-800"}`}
            >
              Orçamentos salvos <span className="ml-1 opacity-75">{estimates.length}</span>
            </button>
          </div>
          {tab === "calculator" && (
            <div
              className="inline-flex rounded-xl border border-slate-800 bg-[#0e1524] p-1"
              role="tablist"
              aria-label="Versão da calculadora"
            >
              <button
                type="button"
                role="tab"
                aria-selected={calculatorMode === "full"}
                onClick={() => setCalculatorMode("full")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${calculatorMode === "full" ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"}`}
              >
                Completa
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={calculatorMode === "express"}
                onClick={() => setCalculatorMode("express")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${calculatorMode === "express" ? "bg-blue-500 text-white" : "text-slate-300 hover:bg-slate-800"}`}
              >
                ⚡ Express
              </button>
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-900 bg-rose-950/60 p-3 text-sm text-rose-200"
          >
            {error}
          </p>
        )}

        {tab === "calculator" ? (
          <form
            onSubmit={save}
            className={
              calculatorMode === "express"
                ? "grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_380px]"
                : "grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
            }
          >
            {calculatorMode === "express" ? (
              <>
                <div className="space-y-4 rounded-[28px] border border-slate-800 bg-[#171719] p-4 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg bg-blue-500/15 p-2 text-xl text-blue-400">⚡</span>
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight text-white">
                        Calculadora Express
                      </h2>
                      <p className="text-[10px] uppercase tracking-widest text-slate-400">
                        Cálculo e orçamento rápido v2
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-4">
                      <section className="grid gap-3 rounded-3xl border border-white/5 p-4 sm:grid-cols-2">
                        <Field
                          label="Identificação do projeto"
                          type="text"
                          value={form.productName}
                          onChange={(v) => update("productName", v)}
                          placeholder="Ex.: Vaso geométrico"
                          required
                          minLength={2}
                        />
                        <label className="grid gap-1.5 text-xs font-semibold text-slate-300">
                          Seleção da impressora
                          <select
                            value={form.printerId}
                            onChange={(event) => update("printerId", event.target.value)}
                            className="h-10 rounded-xl border border-white/10 bg-[#09090b] px-3 text-sm text-white"
                          >
                            <option value="">Personalizado</option>
                            {printers.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      </section>
                      <section className="space-y-4 rounded-3xl border border-white/5 p-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
                            Tipo de cálculo de preço
                          </p>
                          <div className="mt-2 grid grid-cols-2 rounded-xl bg-white/5 p-1">
                            <button
                              type="button"
                              onClick={() => update("marginType", "MARGIN")}
                              className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase ${form.marginType !== "FIXED_PRICE" ? "bg-slate-700 text-blue-400" : "text-slate-400"}`}
                            >
                              Baseado em % de lucro
                            </button>
                            <button
                              type="button"
                              onClick={() => update("marginType", "FIXED_PRICE")}
                              className={`rounded-lg px-2 py-2 text-[10px] font-bold uppercase ${form.marginType === "FIXED_PRICE" ? "bg-slate-700 text-blue-400" : "text-slate-400"}`}
                            >
                              Preço fixo manual
                            </button>
                          </div>
                        </div>
                        {form.marginType === "FIXED_PRICE" ? (
                          <Field
                            label="Preço de venda desejado (R$)"
                            value={form.fixedPrice}
                            onChange={(v) => update("fixedPrice", v)}
                            min={0.01}
                            step="0.01"
                          />
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-end justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold uppercase text-slate-300">
                                  Sua margem
                                </p>
                                <p className="text-[9px] uppercase text-blue-400">
                                  Clique no valor para digitar
                                </p>
                              </div>
                              <Field
                                label="Margem (%)"
                                value={form.marginPercent}
                                onChange={(v) => update("marginPercent", v)}
                                max={99.99}
                              />
                            </div>
                            <input
                              aria-label="Ajustar margem"
                              type="range"
                              min="0"
                              max="99"
                              value={Math.min(99, value(form.marginPercent))}
                              onChange={(e) => update("marginPercent", e.target.value)}
                              className="w-full accent-blue-500"
                            />
                          </div>
                        )}
                      </section>
                      <Section
                        title="Filamentos e consumo"
                        hint="Selecione o material e informe preço, peso da bobina e consumo."
                      >
                        <div className="space-y-3">
                          {form.filamentLines.map((line, i) => (
                            <div
                              key={line.key}
                              className="grid gap-3 rounded-2xl border border-white/5 bg-white/[.02] p-3 sm:grid-cols-2 xl:grid-cols-3"
                            >
                              <label className="grid gap-1 text-[10px] font-bold uppercase text-slate-400">
                                Filamento {i + 1}
                                <select
                                  value={line.stockId}
                                  onChange={(e) => selectFilament(line.key, e.target.value)}
                                  className="h-10 rounded-lg border border-white/10 bg-[#111114] px-2 text-sm normal-case text-white"
                                >
                                  <option value="">Novo / Manual</option>
                                  {filaments.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.material} · {item.brand} · {item.color}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <Field
                                label="Material / tipo"
                                type="text"
                                value={line.material}
                                onChange={(v) => updateFilament(line.key, "material", v)}
                                placeholder="PLA"
                              />
                              <Field
                                label="Preço do rolo (R$)"
                                value={line.rollPrice}
                                onChange={(v) => updateFilament(line.key, "rollPrice", v)}
                              />
                              <Field
                                label="Peso do rolo (g)"
                                value={line.rollWeightG}
                                onChange={(v) => updateFilament(line.key, "rollWeightG", v)}
                              />
                              <Field
                                label="Consumo (gramas)"
                                value={line.consumptionG}
                                onChange={(v) => updateFilament(line.key, "consumptionG", v)}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setForm((f) => ({
                                    ...f,
                                    filamentLines: f.filamentLines.filter(
                                      (x) => x.key !== line.key,
                                    ),
                                  }))
                                }
                                className="self-end rounded-lg border border-white/10 px-3 py-2 text-xs text-rose-300"
                              >
                                Remover
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              filamentLines: [
                                ...f.filamentLines,
                                blankFilament(`express-f-${Date.now()}`),
                              ],
                            }))
                          }
                          className="rounded-lg border border-blue-500/40 px-3 py-2 text-xs font-bold text-blue-400"
                        >
                          ＋ Adicionar filamento
                        </button>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field
                            label="Horas de impressão"
                            value={form.printHours}
                            onChange={(v) => update("printHours", v)}
                            max={720}
                            step="1"
                          />
                          <Field
                            label="Minutos"
                            value={form.printMinutes}
                            onChange={(v) => update("printMinutes", v)}
                            max={59}
                            step="1"
                          />
                        </div>
                      </Section>
                      <Section
                        title="Insumos e adicionais"
                        action={
                          <button
                            type="button"
                            onClick={() =>
                              setForm((f) => ({
                                ...f,
                                supplyLines: [
                                  ...f.supplyLines,
                                  blankSupply(`express-s-${Date.now()}`),
                                ],
                              }))
                            }
                            className="rounded-lg border border-amber-500/40 px-3 py-2 text-xs text-amber-300"
                          >
                            ＋ Adicionar
                          </button>
                        }
                      >
                        {form.supplyLines.length ? (
                          <div className="space-y-2">
                            {form.supplyLines.map((line, i) => (
                              <div
                                key={line.key}
                                className="grid gap-2 sm:grid-cols-[1fr_100px_120px_auto]"
                              >
                                <Field
                                  label={`Insumo ${i + 1}`}
                                  type="text"
                                  value={line.name}
                                  onChange={(v) => updateSupply(line.key, "name", v)}
                                  placeholder="Cola, parafuso, tinta..."
                                />
                                <Field
                                  label="Quantidade"
                                  value={line.quantity}
                                  onChange={(v) => updateSupply(line.key, "quantity", v)}
                                />
                                <Field
                                  label="Custo unitário (R$)"
                                  value={line.unitCost}
                                  onChange={(v) => updateSupply(line.key, "unitCost", v)}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((f) => ({
                                      ...f,
                                      supplyLines: f.supplyLines.filter((x) => x.key !== line.key),
                                    }))
                                  }
                                  className="self-end px-2 py-2 text-xs text-rose-300"
                                >
                                  Remover
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">
                            Adicione custos extras como cola, parafusos, fita e pintura.
                          </p>
                        )}
                      </Section>
                    </div>
                    <div className="space-y-4">
                      <section className="grid gap-3 rounded-3xl border border-white/10 bg-[#111114] p-4 sm:grid-cols-2">
                        <Field
                          label="Consumo médio (kW)"
                          value={form.powerKw}
                          onChange={(v) => update("powerKw", v)}
                          step="0.001"
                          hint="Potência média por hora"
                        />
                        <Field
                          label="Preço kWh (R$)"
                          value={form.electricityPrice}
                          onChange={(v) => update("electricityPrice", v)}
                        />
                        <Field
                          label="Taxa máquina/h (R$)"
                          value={form.machineRatePerHour}
                          onChange={(v) => update("machineRatePerHour", v)}
                        />
                        <Field
                          label="Mão de obra/h (R$)"
                          value={form.laborRatePerHour}
                          onChange={(v) => update("laborRatePerHour", v)}
                        />
                      </section>
                      <section className="space-y-3 rounded-3xl border border-white/10 bg-[#111114] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wide">
                            Mercado Livre & Shopee
                          </span>
                          <label className="flex cursor-pointer items-center gap-2 text-[10px] text-slate-400">
                            Simular marketplace
                            <input
                              type="checkbox"
                              checked={marketplaceOpen}
                              onChange={(e) => setMarketplaceOpen(e.target.checked)}
                              className="accent-emerald-500"
                            />
                          </label>
                        </div>
                        {marketplaceOpen && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-1 text-xs text-slate-300">
                              Marketplace
                              <select
                                value={form.marketplace}
                                onChange={(e) => update("marketplace", e.target.value)}
                                className="h-10 rounded-lg border border-white/10 bg-[#09090b] px-3"
                              >
                                <option value="">Personalizado</option>
                                <option>Shopee</option>
                                <option>Mercado Livre</option>
                                <option>TikTok Shop</option>
                                <option>Outro</option>
                              </select>
                            </label>
                            <Field
                              label="Comissão (%)"
                              value={form.marketplaceFeePercent}
                              onChange={(v) => update("marketplaceFeePercent", v)}
                              max={99.99}
                            />
                            <Field
                              label="Pagamento (%)"
                              value={form.paymentFeePercent}
                              onChange={(v) => update("paymentFeePercent", v)}
                              max={99.99}
                            />
                            <Field
                              label="Impostos (%)"
                              value={form.taxPercent}
                              onChange={(v) => update("taxPercent", v)}
                              max={99.99}
                            />
                            <p className="text-[10px] text-slate-400 sm:col-span-2">
                              Insira as taxas praticadas na sua conta; elas variam por categoria e
                              campanha.
                            </p>
                          </div>
                        )}
                      </section>
                      <section className="overflow-hidden rounded-3xl bg-emerald-600 text-white shadow-xl shadow-emerald-950/30">
                        <div className="flex items-center justify-between bg-emerald-700 px-5 py-3 text-xs font-black uppercase">
                          <span>▣ Resumo de produção</span>
                          <span className="rounded-full bg-white/15 px-2 py-1 text-[9px]">
                            {form.marginType === "FIXED_PRICE"
                              ? "Preço fixo"
                              : `${form.marginPercent}% lucro`}
                          </span>
                        </div>
                        <div className="space-y-4 p-5">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase text-emerald-100/70">
                                Tempo de impressão
                              </p>
                              <p className="mt-1 font-mono font-bold">
                                {value(form.printHours)}h {value(form.printMinutes)}m
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase text-emerald-100/70">
                                Custo de filamento
                              </p>
                              <p className="mt-1 font-bold">{currency(calculation.filamentCost)}</p>
                            </div>
                          </div>
                          <div className="border-t border-white/20 pt-3">
                            <p className="text-[10px] font-bold uppercase text-emerald-100/70">
                              Custo operacional ·{" "}
                              {currency(
                                calculation.electricityCost +
                                  calculation.machineDepreciation +
                                  calculation.laborCost +
                                  calculation.suppliesCost,
                              )}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-1 text-[10px]">
                              <span>Energia: {currency(calculation.electricityCost)}</span>
                              <span>Máquina: {currency(calculation.machineDepreciation)}</span>
                              <span>Mão de obra: {currency(calculation.laborCost)}</span>
                              <span>Extras: {currency(calculation.suppliesCost)}</span>
                            </div>
                          </div>
                          <div className="border-t border-white/20 pt-3">
                            <p className="text-[10px] font-bold uppercase text-emerald-100/70">
                              Investimento de produção
                            </p>
                            <p className="text-xl font-bold">{currency(calculation.cost)}</p>
                          </div>
                          <div className="border-t border-white/20 pt-3">
                            <p className="text-[10px] font-bold uppercase text-emerald-100/70">
                              Preço de venda{" "}
                              {form.marginType === "FIXED_PRICE" ? "definido" : "sugerido"}
                            </p>
                            <p className="text-4xl font-black tracking-tight">
                              {currency(calculation.suggestedPrice)}
                            </p>
                            <p className="mt-1 text-xs">
                              Lucro líquido estimado: <b>{currency(calculation.profit)}</b>
                            </p>
                          </div>
                          <div className="border-t border-white/20 pt-3">
                            <p className="text-[9px] font-bold uppercase text-emerald-100/70">
                              Opções de pagamento
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {["Dinheiro", "Pix", "Débito", "Crédito"].map((method) => (
                                <label key={method} className="flex items-center gap-1 text-[10px]">
                                  <input
                                    type="checkbox"
                                    checked={form.paymentOptions.includes(method)}
                                    onChange={(e) =>
                                      setForm((f) => ({
                                        ...f,
                                        paymentOptions: e.target.checked
                                          ? [...f.paymentOptions, method]
                                          : f.paymentOptions.filter((x) => x !== method),
                                      }))
                                    }
                                    className="accent-white"
                                  />
                                  {method}
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={!calculation.valid}
                          onClick={() => setPreview(quote)}
                          className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black uppercase tracking-wider hover:border-emerald-400 disabled:opacity-40"
                        >
                          ◉ Pré-visualizar orçamento rápido
                        </button>
                        <button
                          type="button"
                          disabled={!calculation.valid}
                          onClick={() =>
                            exportQuote(
                              quote,
                              printers.find((p) => p.id === form.printerId)?.name ?? "",
                            )
                          }
                          className="rounded-2xl bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-slate-950 disabled:opacity-40"
                        >
                          ⇩ Baixar simulação completa
                        </button>
                      </div>
                      <button
                        disabled={saving || !calculation.valid}
                        className="w-full rounded-xl bg-blue-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
                      >
                        {saving ? "Salvando…" : "▣ Salvar orçamento express"}
                      </button>
                      <p className="text-center text-[10px] leading-4 text-slate-500">
                        A prévia permite imprimir ou salvar em PDF. Custos e taxas podem ser
                        conferidos antes de enviar ao cliente.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4">
                  <Section
                    title="Projeto e margem"
                    hint="Identifique este orçamento e defina como a margem será aplicada."
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Nome do projeto *"
                        type="text"
                        value={form.productName}
                        onChange={(next) => update("productName", next)}
                        placeholder="Ex.: Capa protetora v2"
                        required
                        minLength={2}
                      />
                      <label className="grid gap-1.5 text-xs font-medium text-slate-200">
                        Impressora
                        <select
                          value={form.printerId}
                          onChange={(event) => update("printerId", event.target.value)}
                          className="h-10 rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-emerald-400"
                        >
                          <option value="">Selecione a impressora</option>
                          {printers.map((printer) => (
                            <option key={printer.id} value={printer.id}>
                              {printer.name}
                            </option>
                          ))}
                        </select>
                        <span className="text-[11px] font-normal text-slate-400">
                          Equipamento usado nesta impressão
                        </span>
                      </label>
                      <label className="grid gap-1.5 text-xs font-medium text-slate-200">
                        Tipo de preço
                        <select
                          value={form.marginType}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              marginType: event.target.value as FormState["marginType"],
                            }))
                          }
                          className="h-10 rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-emerald-400"
                        >
                          <option value="MARGIN">Lucro baseado em % do preço</option>
                          <option value="MARKUP">Acréscimo sobre o custo (markup)</option>
                          <option value="FIXED_PRICE">Preço fixo manual</option>
                        </select>
                        <span className="text-[11px] font-normal text-slate-400">
                          Margem calculada após custos e taxas.
                        </span>
                      </label>
                      {form.marginType === "FIXED_PRICE" ? (
                        <Field
                          label="Preço de venda definido (R$)"
                          value={form.fixedPrice}
                          onChange={(next) => update("fixedPrice", next)}
                          min={0.01}
                        />
                      ) : (
                        <div className="space-y-1.5">
                          <Field
                            label={`${form.marginType === "MARGIN" ? "Margem de lucro" : "Markup sobre custo"} (%)`}
                            value={form.marginPercent}
                            onChange={(next) => update("marginPercent", next)}
                            min={0}
                            max={99.99}
                          />
                          <input
                            aria-label="Ajustar margem de lucro"
                            type="range"
                            min="0"
                            max="99"
                            step="1"
                            value={Math.min(99, value(form.marginPercent))}
                            onChange={(event) => update("marginPercent", event.target.value)}
                            className="h-2 w-full cursor-pointer accent-emerald-400"
                          />
                        </div>
                      )}
                    </div>
                  </Section>

                  <Section
                    title="Filamentos"
                    hint="Selecione bobinas do estoque ou informe valores manualmente."
                    action={
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            filamentLines: [
                              ...current.filamentLines,
                              blankFilament(`f-${Date.now()}`),
                            ],
                          }))
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500 hover:text-emerald-300"
                      >
                        ＋ Filamento
                      </button>
                    }
                  >
                    {form.filamentLines.length === 0 && (
                      <p className="rounded-lg border border-dashed border-slate-700 p-4 text-xs text-slate-400">
                        Nenhum filamento adicionado.
                      </p>
                    )}
                    <div className="space-y-3">
                      {form.filamentLines.map((line, index) => {
                        const lineCost = money(
                          (value(line.rollPrice) * value(line.consumptionG)) /
                            (value(line.rollWeightG) || 1),
                        );
                        return (
                          <div
                            key={line.key}
                            className="space-y-3 rounded-xl border border-slate-800 bg-[#0a1120] p-4"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-300">
                                Filamento {index + 1}
                              </span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-emerald-300">
                                  {currency(lineCost)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setForm((current) => ({
                                      ...current,
                                      filamentLines: current.filamentLines.filter(
                                        (item) => item.key !== line.key,
                                      ),
                                    }))
                                  }
                                  aria-label={`Remover filamento ${index + 1}`}
                                  className="text-xs text-slate-500 hover:text-rose-300"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                            <label className="grid gap-1.5 text-xs font-medium text-slate-200">
                              Material
                              <select
                                value={line.stockId}
                                onChange={(event) => selectFilament(line.key, event.target.value)}
                                className="h-10 rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-sm text-white outline-none focus:border-emerald-400"
                              >
                                <option value="">Manual / selecionar estoque</option>
                                {filaments.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.material} · {item.brand} · {item.color}
                                    {item.price === null
                                      ? " · sem preço cadastrado"
                                      : ` · ${currency(value(item.price))}`}
                                  </option>
                                ))}
                              </select>
                              <span className="text-[11px] font-normal text-slate-400">
                                Escolha a bobina para preencher os dados do rolo
                              </span>
                            </label>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <Field
                                label="Nome do material"
                                type="text"
                                value={line.material}
                                onChange={(next) => updateFilament(line.key, "material", next)}
                                placeholder="PLA, marca e cor"
                              />
                              <Field
                                label="Preço do rolo (R$)"
                                value={line.rollPrice}
                                onChange={(next) => updateFilament(line.key, "rollPrice", next)}
                                hint="Valor do carretel cheio"
                              />
                              <Field
                                label="Peso do rolo (g)"
                                value={line.rollWeightG}
                                onChange={(next) => updateFilament(line.key, "rollWeightG", next)}
                                min={1}
                                hint="Peso total do carretel"
                              />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <Field
                                label="Consumo nesta peça (g)"
                                value={line.consumptionG}
                                onChange={(next) => updateFilament(line.key, "consumptionG", next)}
                                hint="Gramas usadas nesta peça"
                              />
                              <div className="sm:col-span-2 flex items-end text-xs text-slate-400">
                                Custo proporcional: {currency(lineCost)}{" "}
                                {line.stockId &&
                                filaments.find((item) => item.id === line.stockId)?.price === null
                                  ? "· preço da bobina não cadastrado"
                                  : ""}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Section>

                  <Section
                    title="Insumos e adicionais"
                    hint="Colas, parafusos, fita, pintura, embalagem e outros materiais."
                    action={
                      <button
                        type="button"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            supplyLines: [...current.supplyLines, blankSupply(`s-${Date.now()}`)],
                          }))
                        }
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-500 hover:text-emerald-300"
                      >
                        ＋ Insumo
                      </button>
                    }
                  >
                    {form.supplyLines.length === 0 ? (
                      <p className="text-xs text-slate-400">
                        Nenhum insumo adicional. Clique em “Insumo” para adicionar cola, parafusos,
                        embalagem e outros custos.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {form.supplyLines.map((line, index) => (
                          <div
                            key={line.key}
                            className="grid gap-3 rounded-xl border border-slate-800 bg-[#0a1120] p-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_100px_100px_120px_auto] xl:items-end"
                          >
                            <label className="grid gap-1.5 text-xs font-medium text-slate-200">
                              Estoque
                              <select
                                value={line.inventoryMaterialId}
                                onChange={(event) => selectSupply(line.key, event.target.value)}
                                className="h-10 rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-sm text-white"
                              >
                                <option value="">Manual</option>
                                {supplies.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name}
                                    {item.unitCost === null
                                      ? " · sem custo cadastrado"
                                      : ` · ${currency(value(item.unitCost))}/${item.unit}`}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <Field
                              label={`Insumo ${index + 1}`}
                              type="text"
                              value={line.name}
                              onChange={(next) => updateSupply(line.key, "name", next)}
                              placeholder="Ex.: Caixa para embalagem"
                            />
                            <Field
                              label="Quantidade"
                              value={line.quantity}
                              onChange={(next) => updateSupply(line.key, "quantity", next)}
                              step="0.001"
                            />
                            <Field
                              label="Unidade"
                              type="text"
                              value={line.unit}
                              onChange={(next) => updateSupply(line.key, "unit", next)}
                              placeholder="un, ml, g"
                            />
                            <Field
                              label="Custo unitário (R$)"
                              value={line.unitCost}
                              onChange={(next) => updateSupply(line.key, "unitCost", next)}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  supplyLines: current.supplyLines.filter(
                                    (item) => item.key !== line.key,
                                  ),
                                }))
                              }
                              className="h-10 px-2 text-xs text-slate-500 hover:text-rose-300"
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Section>

                  <Section
                    title="Tempo e custos operacionais"
                    hint="O custo operacional é calculado pelo tempo informado, potência e taxas por hora."
                  >
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      <Field
                        label="Horas de impressão"
                        value={form.printHours}
                        onChange={(next) => update("printHours", next)}
                        min={0}
                        max={720}
                        step="1"
                        hint="Duração em horas"
                      />
                      <Field
                        label="Minutos adicionais"
                        value={form.printMinutes}
                        onChange={(next) => update("printMinutes", next)}
                        min={0}
                        max={59}
                        step="1"
                        hint="De 0 a 59 minutos"
                      />
                      <Field
                        label="Consumo do equipamento (kW)"
                        value={form.powerKw}
                        onChange={(next) => update("powerKw", next)}
                        min={0}
                        max={100}
                        step="0.001"
                        hint="Potência média durante a impressão"
                      />
                      <Field
                        label="Preço da energia (R$/kWh)"
                        value={form.electricityPrice}
                        onChange={(next) => update("electricityPrice", next)}
                        min={0}
                        step="0.001"
                        hint="Tarifa da sua conta de energia"
                      />
                      <Field
                        label="Máquina por hora (R$)"
                        value={form.machineRatePerHour}
                        onChange={(next) => update("machineRatePerHour", next)}
                        min={0}
                        hint="Depreciação e manutenção"
                      />
                      <Field
                        label="Mão de obra por hora (R$)"
                        value={form.laborRatePerHour}
                        onChange={(next) => update("laborRatePerHour", next)}
                        min={0}
                        hint="Custo do trabalho na peça"
                      />
                    </div>
                  </Section>

                  <section className="overflow-hidden rounded-2xl border border-emerald-600/50 bg-gradient-to-r from-emerald-600 to-emerald-400 text-slate-950">
                    <button
                      type="button"
                      onClick={() => setMarketplaceOpen((open) => !open)}
                      aria-expanded={marketplaceOpen}
                      className="flex w-full items-center justify-between px-5 py-4 text-left"
                    >
                      <span className="font-semibold">▣　Calcular taxas de marketplaces</span>
                      <span className="rounded-full bg-emerald-950/20 px-3 py-1 text-[10px] font-bold uppercase">
                        {marketplaceOpen ? "Ativo" : "Configurar"}
                      </span>
                    </button>
                    {marketplaceOpen && (
                      <div className="grid gap-3 border-t border-emerald-900/20 bg-[#0e1524] p-5 text-slate-100 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-xs font-medium">
                          Marketplace
                          <select
                            value={form.marketplace}
                            onChange={(event) => update("marketplace", event.target.value)}
                            className="h-10 rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-sm"
                          >
                            <option value="">Personalizado</option>
                            <option>Shopee</option>
                            <option>Mercado Livre</option>
                            <option>TikTok Shop</option>
                            <option>Outro</option>
                          </select>
                          <span className="text-[11px] font-normal text-slate-400">
                            As tarifas variam por categoria e campanha.
                          </span>
                        </label>
                        <Field
                          label="Comissão do marketplace (%)"
                          value={form.marketplaceFeePercent}
                          onChange={(next) => update("marketplaceFeePercent", next)}
                          max={99.99}
                        />
                        <Field
                          label="Taxa de pagamento (%)"
                          value={form.paymentFeePercent}
                          onChange={(next) => update("paymentFeePercent", next)}
                          max={99.99}
                        />
                        <Field
                          label="Impostos estimados (%)"
                          value={form.taxPercent}
                          onChange={(next) => update("taxPercent", next)}
                          max={99.99}
                        />
                        <p className="text-xs text-slate-400 sm:col-span-2">
                          Informe as taxas vigentes na sua conta. O sistema não presume comissões
                          oficiais nem substitui orientação contábil.
                        </p>
                      </div>
                    )}
                  </section>
                  <button
                    disabled={saving || !calculation.valid}
                    className="w-full rounded-xl bg-emerald-500 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Calculando orçamento…" : "▣　Salvar orçamento completo"}
                  </button>
                </div>

                <aside className="top-6 h-fit space-y-4 rounded-2xl border border-slate-900 bg-[#030712] p-5 shadow-xl xl:sticky">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">
                    Resumo do orçamento
                  </p>
                  <div className="space-y-3 border-b border-slate-800 pb-4">
                    {summaryRows.map(([label, result]) => (
                      <div key={label} className="flex justify-between gap-3 text-xs">
                        <span className="text-slate-400">{label}</span>
                        <strong className="text-right text-slate-100">{result}</strong>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Custo total de produção</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {currency(calculation.cost)}
                    </p>
                  </div>
                  {calculation.valid ? (
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <p className="text-xs text-emerald-200">Preço de venda sugerido</p>
                      <p className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-400">
                        {currency(calculation.suggestedPrice)}
                      </p>
                      <p className="mt-2 text-xs text-emerald-100">
                        Lucro estimado após taxas: <strong>{currency(calculation.profit)}</strong>
                      </p>
                    </div>
                  ) : (
                    <div
                      role="status"
                      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200"
                    >
                      Informe algum custo e confira se taxas, impostos e margem não totalizam 100%
                      ou mais.
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={!calculation.valid}
                      onClick={() => setPreview(quote)}
                      className="rounded-lg border border-slate-700 px-3 py-2.5 text-xs font-semibold hover:border-emerald-400 disabled:opacity-40"
                    >
                      ◉　Pré-visualizar
                    </button>
                    <button
                      type="button"
                      disabled={!calculation.valid}
                      onClick={() =>
                        exportQuote(
                          quote,
                          printers.find((printer) => printer.id === form.printerId)?.name ?? "",
                        )
                      }
                      className="rounded-lg border border-slate-700 px-3 py-2.5 text-xs font-semibold hover:border-emerald-400 disabled:opacity-40"
                    >
                      ⇩　Baixar orçamento
                    </button>
                  </div>
                  <p className="text-[10px] leading-4 text-slate-500">
                    Estimativa por unidade. Preço arredondado para cima ao centavo. Confirme taxas,
                    tarifa de energia e impostos antes de anunciar.
                  </p>
                </aside>
              </>
            )}
          </form>
        ) : (
          <section className="space-y-4">
            {loading ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0e1524] p-8 text-center text-sm text-slate-400">
                Carregando orçamentos…
              </div>
            ) : estimates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center">
                <p className="font-semibold text-white">Nenhum orçamento salvo</p>
                <p className="mt-1 text-sm text-slate-400">
                  Monte seu primeiro cálculo e salve para consultar depois.
                </p>
                <button
                  onClick={() => setTab("calculator")}
                  className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  Abrir calculadora
                </button>
              </div>
            ) : (
              estimates.map((estimate) => {
                const savedQuote = quoteFromEstimate(estimate);
                const savedCalculation = calculate(savedQuote);
                const estimatePrinter =
                  estimate.printer?.name ?? estimate.printerName ?? "Impressora não informada";
                return (
                  <article
                    key={estimate.id}
                    className="rounded-2xl border border-slate-800 bg-[#0e1524] p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {estimate.marketplace || "Orçamento direto"}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-white">
                          {estimate.productName}
                        </h2>
                        <p className="mt-1 text-xs text-slate-400">
                          {estimatePrinter} · {savedQuote.printHours}h {savedQuote.printMinutes}min
                          ·{" "}
                          {new Date(estimate.createdAt).toLocaleDateString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">Preço sugerido</p>
                        <p className="text-2xl font-bold text-emerald-400">
                          {currency(value(estimate.suggestedPrice))}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 border-t border-slate-800 pt-4 sm:grid-cols-4">
                      <div>
                        <p className="text-[11px] text-slate-400">Filamentos</p>
                        <p className="mt-1 text-sm font-semibold">
                          {currency(value(estimate.materialCost))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Custos operacionais</p>
                        <p className="mt-1 text-sm font-semibold">
                          {currency(value(estimate.machineCost) + value(estimate.laborCost))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Insumos</p>
                        <p className="mt-1 text-sm font-semibold">
                          {currency(value(estimate.additionalCost))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-400">Lucro estimado</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-300">
                          {currency(value(estimate.estimatedProfit))}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPreview(savedQuote)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:border-emerald-400"
                      >
                        Pré-visualizar
                      </button>
                      <button
                        type="button"
                        onClick={() => exportQuote(savedQuote, estimatePrinter, savedCalculation)}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:border-emerald-400"
                      >
                        Baixar orçamento completo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setForm(toForm(savedQuote));
                          setTab("calculator");
                        }}
                        className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:border-emerald-400"
                      >
                        Reutilizar cálculo
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(estimate.id)}
                        className="ml-auto rounded-lg px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40"
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </section>
        )}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="quote-preview-title"
            className="quote-print mx-auto my-6 max-w-3xl rounded-2xl border border-slate-700 bg-[#0e1524] p-6 text-slate-100 shadow-2xl sm:p-8"
          >
            <div className="no-print mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                  Prévia do orçamento
                </p>
                <h2 id="quote-preview-title" className="mt-1 text-2xl font-bold">
                  {preview.productName}
                </h2>
              </div>
              <button
                onClick={() => setPreview(null)}
                aria-label="Fechar prévia"
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Fechar
              </button>
            </div>
            <div className="print-header hidden print:block">
              <small>CTRL+FARM · ORÇAMENTO DE PRODUÇÃO</small>
              <h1 className="text-2xl font-bold">{preview.productName}</h1>
            </div>
            {(() => {
              const result = calculate(preview);
              return (
                <>
                  <div className="grid gap-3 border-b border-slate-800 pb-5 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-400">Impressora</p>
                      <p>
                        {printers.find((printer) => printer.id === preview.printerId)?.name ??
                          "Não selecionada"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Tempo</p>
                      <p>
                        {preview.printHours}h {preview.printMinutes}min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Marketplace</p>
                      <p>{preview.marketplace || "Venda direta"}</p>
                    </div>
                  </div>
                  <h3 className="mt-5 font-semibold">Filamentos e insumos</h3>
                  <div className="mt-2 divide-y divide-slate-800">
                    {preview.filamentLines.map((line, index) => (
                      <div key={`p-f-${index}`} className="flex justify-between gap-4 py-2 text-sm">
                        <span>
                          {line.material} · {line.consumptionG} g
                        </span>
                        <span>
                          {currency((line.rollPrice * line.consumptionG) / line.rollWeightG)}
                        </span>
                      </div>
                    ))}
                    {preview.supplyLines.map((line, index) => (
                      <div key={`p-s-${index}`} className="flex justify-between gap-4 py-2 text-sm">
                        <span>
                          {line.name} · {line.quantity} {line.unit}
                        </span>
                        <span>{currency(line.quantity * line.unitCost)}</span>
                      </div>
                    ))}
                  </div>
                  <h3 className="mt-5 font-semibold">Resumo financeiro</h3>
                  <div className="mt-2 space-y-2 border-b border-slate-800 pb-5 text-sm">
                    {[
                      ["Energia", result.electricityCost],
                      ["Máquina e depreciação", result.machineDepreciation],
                      ["Mão de obra", result.laborCost],
                      ["Custo com perdas", result.cost],
                    ].map(([label, amount]) => (
                      <div key={String(label)} className="flex justify-between">
                        <span className="text-slate-400">{label}</span>
                        <span>{currency(Number(amount))}</span>
                      </div>
                    ))}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxas / pagamento / impostos</span>
                      <span>{feeTotal(preview).toFixed(2)}%</span>
                    </div>
                  </div>
                  <div className="mt-5 rounded-xl bg-emerald-500/10 p-5">
                    <p className="text-xs text-emerald-200">Preço de venda sugerido</p>
                    <p className="text-3xl font-bold text-emerald-400">
                      {currency(result.suggestedPrice)}
                    </p>
                    <p className="mt-2 text-sm">
                      Lucro estimado: {currency(result.profit)} ·{" "}
                      {preview.marginType === "MARGIN" ? "Margem" : "Markup"} de{" "}
                      {preview.marginPercent}%
                    </p>
                  </div>
                  <p className="mt-4 text-xs text-slate-400">
                    Taxas, energia e tributos foram informados manualmente. Revise os valores
                    vigentes antes de utilizar este orçamento.
                  </p>
                  <div className="no-print mt-6 flex flex-wrap gap-2">
                    <button
                      onClick={() => window.print()}
                      className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950"
                    >
                      Imprimir / Salvar PDF
                    </button>
                    <button
                      onClick={() =>
                        exportQuote(
                          preview,
                          printers.find((printer) => printer.id === preview.printerId)?.name ?? "",
                        )
                      }
                      className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
                    >
                      Baixar orçamento completo
                    </button>
                  </div>
                </>
              );
            })()}
          </section>
        </div>
      )}
    </div>
  );
}
