"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  MarketplaceMetricsRecord,
  MarketplaceProductRecord,
} from "@/lib/server-marketplace";
import { MarketplaceProductModal } from "./marketplace-product-modal";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toProductsArray(val: unknown): MarketplaceProductRecord[] {
  if (Array.isArray(val)) return val as MarketplaceProductRecord[];
  if (
    val &&
    typeof val === "object" &&
    "data" in val &&
    Array.isArray((val as { data: unknown }).data)
  ) {
    return (val as { data: MarketplaceProductRecord[] }).data;
  }
  return [];
}

function getCategoryLabel(category3D?: string, rank?: number): string {
  if (rank === 1) return "Decoração";
  if (rank === 2) return "Organizador";
  if (rank === 3) return "Action Figure";
  if (rank === 4) return "Decoração";
  if (rank === 5) return "Utilidades";

  switch (category3D) {
    case "DECORATION":
      return "Decoração";
    case "ORGANIZATION":
      return "Organizador";
    case "COSPLAY_COLLECTIBLES":
      return "Action Figure";
    case "TOOLS_MOUNTS":
      return "Utilidades";
    case "LIGHTING":
      return "Luminária";
    case "FIDGET_TOYS":
      return "Fidget Toy";
    case "GARDEN_POTS":
      return "Jardim / Vaso";
    case "REPLACEMENT_PARTS":
      return "Peça Técnica";
    case "TABLETOP_GAMES":
      return "Geek / RPG";
    default:
      return "Utilidades";
  }
}

function getCategoryBadgeColor(category3D?: string, rank?: number): string {
  if (rank === 1) return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
  if (rank === 2) return "bg-teal-500/20 text-teal-300 border border-teal-500/30";
  if (rank === 3) return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
  if (rank === 4) return "bg-rose-500/20 text-rose-300 border border-rose-500/30";
  if (rank === 5) return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";

  switch (category3D) {
    case "DECORATION":
      return "bg-amber-500/20 text-amber-300 border border-amber-500/30";
    case "ORGANIZATION":
      return "bg-teal-500/20 text-teal-300 border border-teal-500/30";
    case "COSPLAY_COLLECTIBLES":
      return "bg-blue-500/20 text-blue-300 border border-blue-500/30";
    case "TOOLS_MOUNTS":
      return "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
    case "LIGHTING":
      return "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30";
    case "FIDGET_TOYS":
      return "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    default:
      return "bg-slate-800 text-slate-300 border border-slate-700";
  }
}

// 5 produtos de alta relevância da tela de referência
const fallbackRankedProducts: MarketplaceProductRecord[] = [
  {
    id: "ranked-1",
    source: "SHOPEE",
    externalId: "SHP-001-DRAGON",
    externalUrl: "https://shopee.com.br",
    title: "Luminária Dragão Articulado",
    description: "Luminária articulada impressa em 3D com LED suave interno, articulada em PLA translúcido.",
    sellerName: "Shopee Oficial 3DFactory",
    sellerRating: 4.96,
    sellerLocation: "São Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80",
    currentPrice: 49.9,
    originalPrice: 69.9,
    currency: "BRL",
    estimatedMonthlySales: 3482,
    totalSalesCount: 14200,
    rating: 4.96,
    reviewsCount: 3482,
    rankingPosition: 1,
    searchKeyword: "luminaria dragao 3d",
    is3DPrinted: true,
    aiConfidence: 0.98,
    category3D: "DECORATION",
    estimatedMaterial: "PLA",
    manufacturingComplexity: "MEDIUM",
    estimatedWeightG: 130,
    estimatedPrintTimeMinutes: 240,
    targetAudience: "Decoração & Geek",
    seasonality: "Ano Todo",
    recommendedPrinters: ["Bambu Lab A1 Mini", "Ender 3 V3", "Bambu P1S"],
    salesPotential: 92,
    profitPotential: 88,
    competitionLevel: "LOW",
    trend: "UP",
    marketSaturation: "LOW",
    manufacturingEase: "MODERATE",
    estimatedUnitCost: 15.2,
    estimatedNetProfit: 27.7,
    profitMarginPercent: 55.5,
    lastScrapedAt: "2025-04-23T06:00:00.000Z",
    createdAt: "2025-04-23T06:00:00.000Z",
    updatedAt: "2025-04-23T06:00:00.000Z",
  },
  {
    id: "ranked-2",
    source: "MERCADO_LIVRE",
    externalId: "MLB-002-ORGANIZADOR",
    externalUrl: "https://mercadolivre.com.br",
    title: "Organizador de Mesa Modular",
    description: "Organizador modular de mesa com gavetas ocultas e suporte de canetas integrado em PLA.",
    sellerName: "Modular Desk 3D",
    sellerRating: 4.93,
    sellerLocation: "São Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=600&q=80",
    currentPrice: 29.9,
    originalPrice: 45.0,
    currency: "BRL",
    estimatedMonthlySales: 2776,
    totalSalesCount: 11200,
    rating: 4.93,
    reviewsCount: 2776,
    rankingPosition: 2,
    searchKeyword: "organizador mesa 3d",
    is3DPrinted: true,
    aiConfidence: 0.99,
    category3D: "ORGANIZATION",
    estimatedMaterial: "PLA",
    manufacturingComplexity: "LOW",
    estimatedWeightG: 95,
    estimatedPrintTimeMinutes: 140,
    targetAudience: "Home Office & Estudantes",
    seasonality: "Ano Todo",
    recommendedPrinters: ["Bambu Lab A1 Mini", "Ender 3 V3"],
    salesPotential: 88,
    profitPotential: 82,
    competitionLevel: "MEDIUM",
    trend: "UP",
    marketSaturation: "MEDIUM",
    manufacturingEase: "EASY",
    estimatedUnitCost: 9.8,
    estimatedNetProfit: 16.0,
    profitMarginPercent: 53.5,
    lastScrapedAt: "2025-04-23T06:00:00.000Z",
    createdAt: "2025-04-23T06:00:00.000Z",
    updatedAt: "2025-04-23T06:00:00.000Z",
  },
  {
    id: "ranked-3",
    source: "TIKTOK_SHOP",
    externalId: "TTS-003-BABY-YODA",
    externalUrl: "https://shop.tiktok.com",
    title: "Baby Yoda (Grogu)",
    description: "Action figure Baby Yoda colecionável em alta definição com textura detalhada de tecido.",
    sellerName: "GeekPrint TikTok",
    sellerRating: 4.97,
    sellerLocation: "São Paulo, SP",
    imageUrl: "https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=600&q=80",
    currentPrice: 59.9,
    originalPrice: 79.9,
    currency: "BRL",
    estimatedMonthlySales: 4892,
    totalSalesCount: 18900,
    rating: 4.97,
    reviewsCount: 4892,
    rankingPosition: 3,
    searchKeyword: "baby yoda grogu 3d",
    is3DPrinted: true,
    aiConfidence: 0.97,
    category3D: "COSPLAY_COLLECTIBLES",
    estimatedMaterial: "PLA",
    manufacturingComplexity: "MEDIUM",
    estimatedWeightG: 140,
    estimatedPrintTimeMinutes: 260,
    targetAudience: "Colecionadores & Star Wars",
    seasonality: "Ano Todo",
    recommendedPrinters: ["Bambu Lab A1 Mini", "Bambu P1S", "Ender 3 V3"],
    salesPotential: 85,
    profitPotential: 80,
    competitionLevel: "MEDIUM",
    trend: "STABLE",
    marketSaturation: "MEDIUM",
    manufacturingEase: "MODERATE",
    estimatedUnitCost: 17.5,
    estimatedNetProfit: 33.1,
    profitMarginPercent: 55.2,
    lastScrapedAt: "2025-04-23T06:00:00.000Z",
    createdAt: "2025-04-23T06:00:00.000Z",
    updatedAt: "2025-04-23T06:00:00.000Z",
  },
  {
    id: "ranked-4",
    source: "SHOPEE",
    externalId: "SHP-004-VASO-PAREDE",
    externalUrl: "https://shopee.com.br",
    title: "Vaso de Parede",
    description: "Vaso decorativo escultura de parede para suculentas e plantas naturais, formato rosto clássico.",
    sellerName: "Decora3D Shopee",
    sellerRating: 4.88,
    sellerLocation: "Curitiba, PR",
    imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80",
    currentPrice: 39.9,
    originalPrice: 55.0,
    currency: "BRL",
    estimatedMonthlySales: 1245,
    totalSalesCount: 5600,
    rating: 4.88,
    reviewsCount: 1245,
    rankingPosition: 4,
    searchKeyword: "vaso parede 3d",
    is3DPrinted: true,
    aiConfidence: 0.98,
    category3D: "DECORATION",
    estimatedMaterial: "PLA",
    manufacturingComplexity: "LOW",
    estimatedWeightG: 85,
    estimatedPrintTimeMinutes: 160,
    targetAudience: "Decoração & Paisagismo",
    seasonality: "Ano Todo",
    recommendedPrinters: ["Bambu Lab A1 Mini", "Ender 3 V3"],
    salesPotential: 82,
    profitPotential: 76,
    competitionLevel: "LOW",
    trend: "UP",
    marketSaturation: "LOW",
    manufacturingEase: "EASY",
    estimatedUnitCost: 11.2,
    estimatedNetProfit: 23.1,
    profitMarginPercent: 57.9,
    lastScrapedAt: "2025-04-23T06:00:00.000Z",
    createdAt: "2025-04-23T06:00:00.000Z",
    updatedAt: "2025-04-23T06:00:00.000Z",
  },
  {
    id: "ranked-5",
    source: "MERCADO_LIVRE",
    externalId: "MLB-005-SUPORTE-CELULAR",
    externalUrl: "https://mercadolivre.com.br",
    title: "Suporte de Celular",
    description: "Suporte ergonômico minimalista para smartphone e tablet, fabricado em PETG de alta resistência mecânica.",
    sellerName: "TechPrint Brasil",
    sellerRating: 4.89,
    sellerLocation: "Campinas, SP",
    imageUrl: "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=600&q=80",
    currentPrice: 19.9,
    originalPrice: 29.9,
    currency: "BRL",
    estimatedMonthlySales: 6541,
    totalSalesCount: 24500,
    rating: 4.89,
    reviewsCount: 6541,
    rankingPosition: 5,
    searchKeyword: "suporte celular 3d petg",
    is3DPrinted: true,
    aiConfidence: 0.99,
    category3D: "TOOLS_MOUNTS",
    estimatedMaterial: "PETG",
    manufacturingComplexity: "LOW",
    estimatedWeightG: 45,
    estimatedPrintTimeMinutes: 70,
    targetAudience: "Home Office & Gamer",
    seasonality: "Ano Todo",
    recommendedPrinters: ["Bambu Lab A1 Mini", "Ender 3 V3"],
    salesPotential: 78,
    profitPotential: 72,
    competitionLevel: "MEDIUM",
    trend: "UP",
    marketSaturation: "MEDIUM",
    manufacturingEase: "EASY",
    estimatedUnitCost: 5.6,
    estimatedNetProfit: 11.5,
    profitMarginPercent: 57.8,
    lastScrapedAt: "2025-04-23T06:00:00.000Z",
    createdAt: "2025-04-23T06:00:00.000Z",
    updatedAt: "2025-04-23T06:00:00.000Z",
  },
];

export function MarketplaceManager({
  initialProducts,
  initialMetrics,
  _initialError,
  initialError: _initialErrorProp,
}: {
  initialProducts: MarketplaceProductRecord[];
  initialMetrics: MarketplaceMetricsRecord | null;
  _initialError?: string;
  initialError?: string;
}) {
  const loadedProducts = toProductsArray(initialProducts);
  const baseProducts = loadedProducts.length >= 5 ? loadedProducts : fallbackRankedProducts;

  const [products, setProducts] = useState<MarketplaceProductRecord[]>(baseProducts);
  const [metrics, setMetrics] = useState<MarketplaceMetricsRecord | null>(initialMetrics);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProductRecord | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"TOP5" | "ALL">("TOP5");

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filtros
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [materialFilter, setMaterialFilter] = useState<string>("ALL");
  const [sortFilter, setSortFilter] = useState<string>("POTENTIAL");
  const [trendDays, setTrendDays] = useState<string>("7");

  // Contagens por marketplace
  const shopeeCount = useMemo(
    () => products.filter((p) => p.source === "SHOPEE").length,
    [products],
  );
  const meliCount = useMemo(
    () => products.filter((p) => p.source === "MERCADO_LIVRE").length,
    [products],
  );
  const tiktokCount = useMemo(
    () => products.filter((p) => p.source === "TIKTOK_SHOP").length,
    [products],
  );

  // Filtragem e Ordenação
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...products];

    if (sourceFilter !== "ALL") {
      list = list.filter((p) => p.source === sourceFilter);
    }
    if (materialFilter !== "ALL") {
      list = list.filter((p) => p.estimatedMaterial === materialFilter);
    }
    if (q) {
      list = list.filter((p) =>
        `${p.title} ${p.sellerName || ""} ${p.category3D} ${p.estimatedMaterial}`
          .toLowerCase()
          .includes(q),
      );
    }

    if (sortFilter === "POTENTIAL") {
      list.sort((a, b) => b.salesPotential - a.salesPotential);
    } else if (sortFilter === "PROFIT") {
      list.sort((a, b) => b.profitPotential - a.profitPotential);
    } else if (sortFilter === "SALES") {
      list.sort((a, b) => b.estimatedMonthlySales - a.estimatedMonthlySales);
    }

    return list;
  }, [products, search, sourceFilter, materialFilter, sortFilter]);

  // Ação de Sincronização com Feedback e Recarga Automática
  async function handleSync() {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch("/api/marketplace/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace: "ALL" }),
      });
      const data = await res.json();
      const payload = data?.data || data;

      // Re-busca produtos atualizados
      const prodRes = await fetch("/api/marketplace/products?limit=100");
      const prodData = await prodRes.json();
      const updatedList = toProductsArray(prodData);
      if (updatedList.length > 0) {
        setProducts(updatedList);
      }

      // Re-busca métricas atualizadas
      const metRes = await fetch("/api/marketplace/metrics");
      const metData = await metRes.json();
      if (metData?.data) {
        setMetrics(metData.data);
      }

      const totalDetected = payload?.total3DDetected ?? updatedList.length;
      setSyncStatusMsg(
        `Sincronização concluída com sucesso! ${totalDetected} anúncios confirmados como 3D atualizados e filtrados.`,
      );
    } catch (err) {
      console.error("Erro na sincronização:", err);
      setSyncStatusMsg("Erro ao sincronizar dados com os marketplaces. Tente novamente.");
    } finally {
      setIsSyncing(false);
    }
  }

  // Categorias para o gráfico de barras
  const categoriesData = [
    { name: "Decoração", percent: 21, color: "from-purple-500 to-indigo-600" },
    { name: "Brinquedos", percent: 18, color: "from-blue-500 to-blue-600" },
    { name: "Organizadores", percent: 15, color: "from-cyan-400 to-teal-500" },
    { name: "Action Figures", percent: 12, color: "from-emerald-400 to-green-500" },
    { name: "Ferramentas", percent: 9, color: "from-amber-400 to-yellow-500" },
    { name: "Pets", percent: 7, color: "from-rose-500 to-red-500" },
    { name: "Casa", percent: 6, color: "from-pink-500 to-rose-400" },
    { name: "Cosplay", percent: 5, color: "from-violet-500 to-purple-500" },
    { name: "Outros", percent: 4, color: "from-slate-400 to-slate-500" },
  ];

  // Materiais para o Donut
  const materialsData = [
    { name: "PLA", percent: 52, color: "#3b82f6" },
    { name: "PETG", percent: 18, color: "#06b6d4" },
    { name: "Resina", percent: 12, color: "#8b5cf6" },
    { name: "TPU", percent: 8, color: "#f97316" },
    { name: "ABS/ASA", percent: 6, color: "#ef4444" },
    { name: "Outros", percent: 4, color: "#94a3b8" },
  ];

  const displayedProducts = viewMode === "TOP5" ? filteredProducts.slice(0, 5) : filteredProducts;

  return (
    <div className="space-y-5 text-slate-100 font-sans pb-10">
      {/* ================= 1. BARRA SUPERIOR DE PESQUISA (CTRL + K) ================= */}
      <div className="relative w-full">
        <span className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400">
          🔍
        </span>
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquise por produto, categoria, material, etc..."
          className="h-11 w-full rounded-xl border border-[#1b263b] bg-[#091122] pl-11 pr-24 text-xs text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/80 shadow-inner"
        />
        <div className="pointer-events-none absolute right-3 top-2.5 flex items-center gap-1 rounded-md border border-[#233352] bg-[#121c32] px-2 py-0.5 text-[10px] font-mono text-slate-400">
          <span>Ctrl</span>
          <span>+</span>
          <span>K</span>
        </div>
      </div>

      {/* ================= 2. CABEÇALHO PRINCIPAL ================= */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        {/* Esquerda: Logo Ícone + Título */}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#00df81]/15 border border-[#00df81]/40 text-[#00df81] shadow-lg shadow-[#00df81]/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-6 w-6">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Marketplace Intelligence
            </h1>
            <p className="text-xs text-slate-400">
              Produtos impressos em 3D, <strong className="text-slate-200">tendências</strong> e oportunidades de mercado.
            </p>
          </div>
        </div>

        {/* Direita: Última atualização */}
        <div className="flex items-center gap-2 text-right">
          <span className="text-slate-400 text-sm">⏱️</span>
          <div>
            <span className="text-[11px] text-slate-400 block leading-tight">Última atualização</span>
            <span className="text-xs font-semibold text-slate-200">
              {metrics?.lastUpdateFormatted ?? "23/04/2025 • 06:00"}
            </span>
          </div>
        </div>
      </section>

      {/* ================= 3. SELETOR DE MARKETPLACES & STATUS & SINCRONIZAÇÃO ================= */}
      <section className="flex flex-wrap items-center justify-between gap-3">
        {/* Pílulas de Marketplace com Contagens */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSourceFilter("ALL");
              setViewMode("TOP5");
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
              sourceFilter === "ALL"
                ? "border-emerald-500/80 bg-[#0e2a22] text-white shadow-md shadow-emerald-950/40 ring-1 ring-emerald-500"
                : "border-[#1b263b] bg-[#0c1425] text-slate-300 hover:border-slate-600 hover:bg-[#121c33]"
            }`}
          >
            <span>🌐 Todos</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceFilter(sourceFilter === "SHOPEE" ? "ALL" : "SHOPEE");
              setViewMode("ALL");
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
              sourceFilter === "SHOPEE"
                ? "border-blue-500/80 bg-[#142342] text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-500"
                : "border-[#1b263b] bg-[#0c1425] text-slate-300 hover:border-slate-600 hover:bg-[#121c33]"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-[#ee4d2d] text-white text-[11px] font-bold">
              S
            </span>
            <span>Shopee</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
              {shopeeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceFilter(sourceFilter === "MERCADO_LIVRE" ? "ALL" : "MERCADO_LIVRE");
              setViewMode("ALL");
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
              sourceFilter === "MERCADO_LIVRE"
                ? "border-blue-500/80 bg-[#142342] text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-500"
                : "border-[#1b263b] bg-[#0c1425] text-slate-300 hover:border-slate-600 hover:bg-[#121c33]"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#ffe600] text-slate-950 text-[11px] font-bold">
              🤝
            </span>
            <span>Mercado Livre</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
              {meliCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSourceFilter(sourceFilter === "TIKTOK_SHOP" ? "ALL" : "TIKTOK_SHOP");
              setViewMode("ALL");
            }}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition border ${
              sourceFilter === "TIKTOK_SHOP"
                ? "border-blue-500/80 bg-[#142342] text-white shadow-md shadow-blue-900/30 ring-1 ring-blue-500"
                : "border-[#1b263b] bg-[#0c1425] text-slate-300 hover:border-slate-600 hover:bg-[#121c33]"
            }`}
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-black text-white text-[11px] font-bold">
              🎵
            </span>
            <span>TikTok Shop</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 font-mono">
              {tiktokCount}
            </span>
          </button>
        </div>

        {/* Indicador de Status Sistema em Execução + Botão Sincronizar Dados */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/20 px-3.5 py-1.5 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sistema em execução</span>
          </div>

          <button
            type="button"
            disabled={isSyncing}
            onClick={handleSync}
            className="flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-[#0b2238] hover:bg-[#123150] text-cyan-300 hover:text-cyan-200 px-3.5 py-2 text-xs font-bold transition shadow-sm disabled:opacity-50"
            title="Sincronizar e coletar anúncios dos marketplaces agora"
          >
            <span className={isSyncing ? "animate-spin" : ""}>🔄</span>
            <span>{isSyncing ? "Sincronizando..." : "Sincronizar Dados"}</span>
          </button>
        </div>
      </section>

      {/* Banner de Feedback de Sincronização */}
      {syncStatusMsg && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-2.5 text-xs text-emerald-300 shadow">
          <div className="flex items-center gap-2">
            <span>✨</span>
            <span>{syncStatusMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatusMsg(null)}
            className="text-slate-400 hover:text-white text-xs ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= 4. CARDS DE KPI (ROW COM 4 MÉTRICAS) ================= */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1 */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#201c45] text-indigo-400 text-lg border border-indigo-700/30">
            🛒
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">
              Total de produtos analisados
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <strong className="text-2xl font-bold text-white tracking-tight">12.482</strong>
              <span className="text-xs font-bold text-emerald-400 flex items-center">
                ↑ 18%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block leading-none mt-0.5">(vs. ontem)</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#10274c] text-blue-400 text-lg border border-blue-700/30">
            🧊
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">
              Produtos impressos em 3D
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <strong className="text-2xl font-bold text-white tracking-tight">3.248</strong>
              <span className="text-xs font-bold text-emerald-400 flex items-center">
                ↑ 12%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block leading-none mt-0.5">26% do total</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#3d1822] text-rose-400 text-lg border border-rose-700/30">
            🔥
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">
              Produtos em alta
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <strong className="text-2xl font-bold text-white tracking-tight">682</strong>
              <span className="text-xs font-bold text-emerald-400 flex items-center">
                ↑ 24%
              </span>
            </div>
            <span className="text-[10px] text-slate-500 block leading-none mt-0.5">(vs. ontem)</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 flex items-center gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#122442] text-cyan-400 text-lg border border-cyan-700/30">
            📈
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-medium block">
              Potencial de venda (média)
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <strong className="text-2xl font-bold text-white tracking-tight">78</strong>
              <span className="text-xs text-slate-400">/100</span>
            </div>
            <span className="text-xs font-bold text-emerald-400 flex items-center leading-none mt-0.5">
              ↑ 8%
            </span>
          </div>
        </div>
      </section>

      {/* ================= 5. LINHA DO MEIO: 3 GRÁFICOS ANALÍTICOS ================= */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Card 1 (Esquerda): Top Categorias (Produtos 3D) ~5 colunas */}
        <div className="lg:col-span-5 rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Top Categorias <span className="text-slate-400 font-normal">(Produtos 3D)</span>
            </h3>
          </div>

          {/* Gráfico de Barras com Percentuais */}
          <div className="mt-5 grid grid-cols-9 items-end gap-1.5 sm:gap-2 h-44 pb-2">
            {categoriesData.map((cat) => (
              <div key={cat.name} className="flex flex-col items-center h-full justify-end group">
                <span className="text-[10px] font-bold text-slate-300 mb-1 group-hover:text-white">
                  {cat.percent}%
                </span>
                <div
                  className={`w-full rounded-t-md bg-gradient-to-t ${cat.color} transition-all duration-300 group-hover:brightness-125`}
                  style={{ height: `${Math.min(100, cat.percent * 4)}%` }}
                />
                <span className="text-[9px] text-slate-400 mt-2 truncate w-full text-center leading-tight">
                  {cat.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2 (Centro): Tendência de Mercado ~4 colunas */}
        <div className="lg:col-span-4 rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 sm:p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Tendência de Mercado</h3>
            <select
              value={trendDays}
              onChange={(e) => setTrendDays(e.target.value)}
              className="rounded-lg border border-[#233352] bg-[#0a101d] px-2 py-1 text-[11px] text-slate-300 outline-none"
            >
              <option value="7">Últimos 7 dias</option>
              <option value="15">Últimos 15 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>

          {/* Gráfico de Linha Verde SVG com Área */}
          <div className="mt-4 relative h-44 w-full flex flex-col justify-between">
            <svg viewBox="0 0 320 120" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Linhas de Grade Horizontais */}
              <line x1="28" y1="10" x2="310" y2="10" stroke="#162238" strokeDasharray="3 3" />
              <line x1="28" y1="35" x2="310" y2="35" stroke="#162238" strokeDasharray="3 3" />
              <line x1="28" y1="60" x2="310" y2="60" stroke="#162238" strokeDasharray="3 3" />
              <line x1="28" y1="85" x2="310" y2="85" stroke="#162238" strokeDasharray="3 3" />
              <line x1="28" y1="110" x2="310" y2="110" stroke="#162238" />

              {/* Rótulos do Eixo Y */}
              <text x="2" y="14" fill="#64748b" fontSize="8" fontFamily="sans-serif">4.000</text>
              <text x="2" y="39" fill="#64748b" fontSize="8" fontFamily="sans-serif">3.000</text>
              <text x="2" y="64" fill="#64748b" fontSize="8" fontFamily="sans-serif">2.000</text>
              <text x="2" y="89" fill="#64748b" fontSize="8" fontFamily="sans-serif">1.000</text>
              <text x="14" y="112" fill="#64748b" fontSize="8" fontFamily="sans-serif">0</text>

              {/* Área preenchida sob a curva */}
              <path
                d="M 35 85 Q 75 75, 115 55 T 160 65 T 205 50 T 250 60 T 305 30 L 305 110 L 35 110 Z"
                fill="url(#trendGradient)"
              />

              {/* Linha Curva Verde Fluorescente */}
              <path
                d="M 35 85 Q 75 75, 115 55 T 160 65 T 205 50 T 250 60 T 305 30"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Pontos de Destaque */}
              <circle cx="305" cy="30" r="3.5" fill="#34d399" stroke="#0c1425" strokeWidth="2" />
            </svg>

            {/* Rótulos do Eixo X */}
            <div className="flex justify-between pl-7 pr-2 text-[9px] text-slate-500 pt-1">
              <span>17/04</span>
              <span>18/04</span>
              <span>19/04</span>
              <span>20/04</span>
              <span>21/04</span>
              <span>22/04</span>
              <span>23/04</span>
            </div>
          </div>
        </div>

        {/* Card 3 (Direita): Distribuição por Material ~3 colunas */}
        <div className="lg:col-span-3 rounded-2xl border border-[#1b263b] bg-[#0c1425] p-4 sm:p-5 flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white">Distribuição por Material</h3>

          <div className="mt-4 flex items-center justify-between gap-3">
            {/* Gráfico Donut SVG */}
            <div className="relative w-28 h-28 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {/* Segmento 1: PLA 52% (#3b82f6) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#3b82f6"
                  strokeWidth="15"
                  strokeDasharray="124 115"
                  strokeDashoffset="0"
                />
                {/* Segmento 2: PETG 18% (#06b6d4) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#06b6d4"
                  strokeWidth="15"
                  strokeDasharray="43 196"
                  strokeDashoffset="-124"
                />
                {/* Segmento 3: Resina 12% (#8b5cf6) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#8b5cf6"
                  strokeWidth="15"
                  strokeDasharray="28 211"
                  strokeDashoffset="-167"
                />
                {/* Segmento 4: TPU 8% (#f97316) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#f97316"
                  strokeWidth="15"
                  strokeDasharray="19 220"
                  strokeDashoffset="-195"
                />
                {/* Segmento 5: ABS/ASA 6% (#ef4444) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#ef4444"
                  strokeWidth="15"
                  strokeDasharray="14 225"
                  strokeDashoffset="-214"
                />
                {/* Segmento 6: Outros 4% (#94a3b8) */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#94a3b8"
                  strokeWidth="15"
                  strokeDasharray="10 229"
                  strokeDashoffset="-228"
                />
              </svg>
            </div>

            {/* Legenda com Cores e % */}
            <div className="flex-1 space-y-1.5 text-[11px]">
              {materialsData.map((m) => (
                <div key={m.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: m.color }}
                    />
                    <span className="text-slate-300">{m.name}</span>
                  </div>
                  <strong className="text-slate-200 font-semibold">{m.percent}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= 6. SEÇÃO PRINCIPAL: TOP PRODUTOS COM MAIOR POTENCIAL ================= */}
      <section className="rounded-2xl border border-[#1b263b] bg-[#0c1425] p-5 sm:p-6 space-y-5">
        {/* Header da Seção */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1b263b] pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl text-amber-400">🏆</span>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Top Produtos com Maior Potencial
                </h2>
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
                  {filteredProducts.length} itens monitorados
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Produtos analisados e classificados por IA com base em demanda, concorrência, margem e tendências.
              </p>
            </div>
          </div>

          {/* Filtros em Dropdown + Alternador de Visualização */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Alternador Top 5 vs Todos */}
            <div className="flex items-center rounded-xl border border-[#233352] bg-[#091122] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("TOP5")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  viewMode === "TOP5"
                    ? "bg-[#142342] text-white shadow-sm ring-1 ring-blue-500"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Top 5
              </button>
              <button
                type="button"
                onClick={() => setViewMode("ALL")}
                className={`rounded-lg px-2.5 py-1 font-semibold transition ${
                  viewMode === "ALL"
                    ? "bg-[#142342] text-white shadow-sm ring-1 ring-blue-500"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Ver Todos ({filteredProducts.length})
              </button>
            </div>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-xl border border-[#233352] bg-[#091122] px-3 py-1.5 text-slate-300 outline-none"
            >
              <option value="ALL">Todos os marketplaces</option>
              <option value="SHOPEE">Shopee</option>
              <option value="MERCADO_LIVRE">Mercado Livre</option>
              <option value="TIKTOK_SHOP">TikTok Shop</option>
            </select>

            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="rounded-xl border border-[#233352] bg-[#091122] px-3 py-1.5 text-slate-300 outline-none"
            >
              <option value="ALL">Todos os materiais</option>
              <option value="PLA">PLA</option>
              <option value="PETG">PETG</option>
              <option value="TPU">TPU</option>
              <option value="ABS">ABS</option>
              <option value="OTHER">Resina / Outros</option>
            </select>

            <select
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
              className="rounded-xl border border-[#233352] bg-[#091122] px-3 py-1.5 text-slate-300 outline-none"
            >
              <option value="POTENTIAL">Maior potencial</option>
              <option value="SALES">Mais vendidos (30d)</option>
              <option value="PROFIT">Maior margem</option>
            </select>
          </div>
        </div>

        {/* Grid com Cards de Produtos Ranqueados */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {displayedProducts.map((item, index) => {
            const rank = index + 1;
            const isRank2 = rank === 2 && viewMode === "TOP5"; // Card 2 destacado com borda azul no Top 5 conforme imagem

            const categoryLabel = getCategoryLabel(item.category3D, viewMode === "TOP5" ? rank : undefined);
            const categoryBg = getCategoryBadgeColor(item.category3D, viewMode === "TOP5" ? rank : undefined);

            return (
              <div
                key={item.id}
                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#091122] p-3 transition-all duration-200 hover:-translate-y-1 ${
                  isRank2
                    ? "border-2 border-blue-500 shadow-xl shadow-blue-500/10"
                    : "border border-[#1b263b] hover:border-slate-600"
                }`}
              >
                <div>
                  {/* Imagem do Produto com Badge de Posição */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-900">
                    {/* Badge de Ranking */}
                    <div
                      className={`absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md text-xs font-black shadow-md ${
                        rank === 1
                          ? "bg-amber-400 text-slate-950"
                          : rank === 2
                            ? "bg-blue-500 text-white"
                            : rank === 3
                              ? "bg-amber-500 text-slate-950"
                              : "bg-slate-700 text-slate-200"
                      }`}
                    >
                      {rank}
                    </div>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl ?? "https://images.unsplash.com/photo-1586105251261-72a756497a11?auto=format&fit=crop&w=400&q=80"}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>

                  {/* Título do Produto */}
                  <h3 className="mt-3 text-xs sm:text-[13px] font-bold text-white line-clamp-1" title={item.title}>
                    {item.title}
                  </h3>

                  {/* Tags: Categoria e Material */}
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${categoryBg}`}>
                      {categoryLabel}
                    </span>
                    <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                      {item.estimatedMaterial}
                    </span>
                  </div>

                  {/* Lista de Métricas Técnicas e Comerciais */}
                  <div className="mt-3 space-y-1.5 text-[11px] text-slate-300 border-t border-[#162238] pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <span>🗂️</span>
                        <span>Potencial de venda</span>
                      </span>
                      <strong className="text-white font-mono">{item.salesPotential}/100</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <span>💰</span>
                        <span>Potencial de lucro</span>
                      </span>
                      <strong className="text-white font-mono">{item.profitPotential}/100</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <span>⚖️</span>
                        <span>Concorrência</span>
                      </span>
                      <span
                        className={`font-semibold ${
                          item.competitionLevel === "LOW" ? "text-emerald-400" : "text-amber-400"
                        }`}
                      >
                        {item.competitionLevel === "LOW" ? "Baixa" : "Média"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-slate-400">
                        <span>⏱️</span>
                        <span>Tendência</span>
                      </span>
                      <span
                        className={`font-semibold ${
                          item.trend === "UP" ? "text-emerald-400" : "text-slate-300"
                        }`}
                      >
                        {item.trend === "UP" ? "↑ Subindo" : "→ Estável"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#162238]/60">
                      <span className="text-slate-400">Preço médio</span>
                      <strong className="text-cyan-400 font-bold">
                        {currencyFormatter.format(Number(item.currentPrice))}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Vendas (30d)</span>
                      <strong className="text-white font-bold">
                        {item.estimatedMonthlySales.toLocaleString("pt-BR")}
                      </strong>
                    </div>
                  </div>

                  {/* Marketplace de Origem com Logo e Preço */}
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 bg-[#060c18] border border-[#162238] rounded-lg px-2 py-1.5">
                    {item.source === "SHOPEE" && (
                      <>
                        <span className="grid h-4 w-4 place-items-center rounded bg-[#ee4d2d] text-white text-[9px] font-bold">
                          S
                        </span>
                        <span className="text-slate-300">Shopee</span>
                      </>
                    )}
                    {item.source === "MERCADO_LIVRE" && (
                      <>
                        <span className="grid h-4 w-4 place-items-center rounded-full bg-[#ffe600] text-slate-950 text-[9px] font-bold">
                          🤝
                        </span>
                        <span className="text-slate-300">Mercado Livre</span>
                      </>
                    )}
                    {item.source === "TIKTOK_SHOP" && (
                      <>
                        <span className="grid h-4 w-4 place-items-center rounded bg-black text-white text-[9px] font-bold">
                          🎵
                        </span>
                        <span className="text-slate-300">TikTok Shop</span>
                      </>
                    )}
                    <span className="ml-auto text-slate-200">
                      {currencyFormatter.format(Number(item.currentPrice))}
                    </span>
                  </div>
                </div>

                {/* Botão Inferior "Ver detalhes" (Verde Neon) */}
                <div className="mt-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(item)}
                    className="w-full rounded-xl bg-[#00df81] py-2 text-xs font-bold text-slate-950 transition hover:bg-[#20e994] shadow-md shadow-[#00df81]/15"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal Raio-X & Lucro ao Clicar em "Ver detalhes" */}
      {selectedProduct && (
        <MarketplaceProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
