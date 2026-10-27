"use client";

import { useMemo, useState } from "react";
import type { ProductRecord } from "@/lib/server-products";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Edit2,
  Image as ImageIcon,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

interface ProductsManagerProps {
  initialProducts: ProductRecord[];
  initialError?: string;
  currentUserRole?: string;
}

export function ProductsManager({
  initialProducts,
  initialError = "",
  currentUserRole = "ADMIN",
}: ProductsManagerProps) {
  const [products, setProducts] = useState<ProductRecord[]>(initialProducts);
  const [error, setError] = useState(initialError);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    imageUrl: "",
    quantity: 0,
    minQuantity: 5,
    costPrice: 0,
    sellingPrice: 0,
    weightGrams: 0,
    dimensions: "",
    status: "IN_STOCK",
    notes: "",
  });

  const canManage = currentUserRole === "ADMIN" || currentUserRole === "MODERATOR";

  // Filtered categories
  const existingCategories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.category) set.add(p.category);
    }
    return Array.from(set).sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter === "ALL" || p.status === statusFilter;
      const matchCategory = categoryFilter === "ALL" || p.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [products, searchTerm, statusFilter, categoryFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalItems = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
    const lowStockCount = products.filter(
      (p) => p.status === "LOW_STOCK" || (p.minQuantity > 0 && p.quantity <= p.minQuantity),
    ).length;
    const totalValueCost = products.reduce(
      (acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.costPrice) || 0),
      0,
    );
    const totalValueSelling = products.reduce(
      (acc, p) => acc + (Number(p.quantity) || 0) * (Number(p.sellingPrice) || 0),
      0,
    );
    return {
      totalProducts: products.length,
      totalItems,
      lowStockCount,
      totalValueCost,
      totalValueSelling,
    };
  }, [products]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      sku: "",
      category: "",
      imageUrl: "",
      quantity: 1,
      minQuantity: 5,
      costPrice: 0,
      sellingPrice: 0,
      weightGrams: 0,
      dimensions: "",
      status: "IN_STOCK",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductRecord) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || "",
      category: p.category || "",
      imageUrl: p.imageUrl || "",
      quantity: p.quantity,
      minQuantity: p.minQuantity,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      weightGrams: p.weightGrams || 0,
      dimensions: p.dimensions || "",
      status: p.status,
      notes: p.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("O nome do produto é obrigatório.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Falha ao salvar produto.");

      if (editingProduct) {
        setProducts((prev) =>
          prev.map((item) => (item.id === editingProduct.id ? json.data : item)),
        );
      } else {
        setProducts((prev) => [json.data, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro desconhecido ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${name}"?`)) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao remover produto.");
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao remover.");
    }
  };

  const handleStockAdjustment = async (id: string, delta: number) => {
    setAdjustingId(id);
    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao atualizar estoque.");
      setProducts((prev) => prev.map((p) => (p.id === id ? json.data : p)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro no ajuste de estoque.");
    } finally {
      setAdjustingId(null);
    }
  };

  // Real-time margin calculator for the modal
  const calculatedMargin = useMemo(() => {
    const cost = Number(formData.costPrice) || 0;
    const sell = Number(formData.sellingPrice) || 0;
    if (sell <= 0) return { marginPercent: 0, profit: 0 };
    const profit = sell - cost;
    const marginPercent = (profit / sell) * 100;
    return { marginPercent, profit };
  }, [formData.costPrice, formData.sellingPrice]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-rose-300 text-sm backdrop-blur-sm">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-rose-400 hover:text-rose-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Total Produtos
              </p>
              <h3 className="mt-1 text-2xl font-bold text-white">{metrics.totalProducts}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">{metrics.totalItems} unidades em estoque</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Atenção / Reposição
              </p>
              <h3 className="mt-1 text-2xl font-bold text-amber-400">{metrics.lowStockCount}</h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Produtos no estoque mínimo ou zerados</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Valor em Custo
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-200">
                {metrics.totalValueCost.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-500/10 text-slate-400 border border-slate-500/20">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Investimento imobilizado</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-400">
                Previsão de Venda
              </p>
              <h3 className="mt-1 text-2xl font-bold text-emerald-400">
                {metrics.totalValueSelling.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </h3>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Potencial bruto de faturamento</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & New Button */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-slate-900/50 p-4 backdrop-blur-md md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-300 focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="ALL">Todos os status</option>
              <option value="IN_STOCK">Em Estoque</option>
              <option value="LOW_STOCK">Estoque Baixo</option>
              <option value="OUT_OF_STOCK">Esgotado</option>
              <option value="DISCONTINUED">Descontinuado</option>
            </select>

            {existingCategories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-300 focus:border-cyan-500/50 focus:outline-none"
              >
                <option value="ALL">Todas categorias</option>
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            Cadastrar Produto
          </button>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30 py-16 text-center">
          <Package className="h-12 w-12 text-slate-600 mb-3" />
          <h4 className="text-base font-semibold text-slate-300">Nenhum produto encontrado</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {searchTerm || statusFilter !== "ALL" || categoryFilter !== "ALL"
              ? "Tente ajustar os filtros ou termos da busca."
              : "Cadastre produtos acabados para gerenciar seu estoque de peças e impressões prontas."}
          </p>
          {canManage && !searchTerm && (
            <button
              type="button"
              onClick={openCreateModal}
              className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
            >
              Criar primeiro produto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p) => {
            const cost = Number(p.costPrice) || 0;
            const sell = Number(p.sellingPrice) || 0;
            const margin = sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : "0";
            const isLow = p.minQuantity > 0 && p.quantity <= p.minQuantity && p.quantity > 0;
            const isOut = p.quantity <= 0;

            return (
              <div
                key={p.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 p-5 backdrop-blur-md transition-all hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5"
              >
                <div>
                  {/* Header: Image / Category / Status */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 flex items-center justify-center">
                      {p.imageUrl ? (
                        // biome-ignore lint/performance/noImgElement: user dynamic product image
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-slate-600" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {p.category && (
                          <span className="rounded-md border border-white/5 bg-slate-800/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-cyan-300">
                            {p.category}
                          </span>
                        )}
                        {p.sku && (
                          <span className="text-[11px] font-mono text-slate-400">#{p.sku}</span>
                        )}
                      </div>

                      <h4
                        className="mt-1 font-semibold text-white truncate text-base"
                        title={p.name}
                      >
                        {p.name}
                      </h4>

                      <div className="mt-1 flex items-center gap-1.5">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/20">
                            Esgotado
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Estoque Baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Disponível
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Stock Quick Controls */}
                  <div className="mt-4 rounded-xl border border-white/5 bg-slate-950/40 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Estoque atual:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-base font-bold text-white">{p.quantity}</span>
                        <span className="text-[11px] text-slate-500">/ mín {p.minQuantity}</span>
                      </div>
                    </div>

                    {/* Stock Progress Bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full transition-all ${
                          isOut ? "bg-rose-500 w-0" : isLow ? "bg-amber-400" : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            p.minQuantity > 0 ? (p.quantity / (p.minQuantity * 2)) * 100 : 100,
                          )}%`,
                        }}
                      />
                    </div>

                    {canManage && (
                      <div className="mt-3 flex items-center justify-between gap-1 pt-2 border-t border-white/5">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Ajuste Rápido:
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={adjustingId === p.id || p.quantity <= 0}
                            onClick={() => handleStockAdjustment(p.id, -1)}
                            className="rounded-lg border border-white/10 bg-slate-800/80 p-1 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                            title="Diminuir 1"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={adjustingId === p.id}
                            onClick={() => handleStockAdjustment(p.id, 1)}
                            className="rounded-lg border border-white/10 bg-slate-800/80 p-1 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-40"
                            title="Adicionar 1"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            disabled={adjustingId === p.id}
                            onClick={() => handleStockAdjustment(p.id, 5)}
                            className="rounded-lg border border-white/10 bg-slate-800/80 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 hover:bg-slate-700 hover:text-cyan-200 disabled:opacity-40"
                            title="Adicionar lote (+5)"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financials / Pricing Info */}
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-white/5 bg-slate-950/20 p-2.5 text-center">
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Custo</p>
                      <p className="text-xs font-semibold text-slate-300">
                        {cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Venda</p>
                      <p className="text-xs font-semibold text-emerald-400">
                        {sell.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-500">Margem</p>
                      <p className="text-xs font-bold text-cyan-400">{margin}%</p>
                    </div>
                  </div>

                  {/* Weight / Dimensions */}
                  {(p.weightGrams || p.dimensions) && (
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 px-1">
                      {p.weightGrams ? <span>Peso: {p.weightGrams}g</span> : <span />}
                      {p.dimensions ? <span>Dimensões: {p.dimensions}</span> : <span />}
                    </div>
                  )}

                  {p.notes && (
                    <p className="mt-2 text-xs text-slate-400 line-clamp-2 px-1 italic">
                      "{p.notes}"
                    </p>
                  )}
                </div>

                {/* Card Footer Actions */}
                {canManage && (
                  <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-white/5 pt-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.name)}
                      className="flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingProduct ? "Editar Produto" : "Novo Produto Acabado"}
                </h3>
                <p className="text-xs text-slate-400">
                  Gerencie produtos prontos para pronta entrega e venda comercial.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Suporte Articulado para Celular"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Código SKU / Referência
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SUP-CEL-01"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Utilitários, Colecionáveis..."
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    URL da Imagem / Foto
                  </label>
                  <input
                    type="url"
                    placeholder="https://exemplo.com/foto-produto.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estoque Atual (Qtd)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minQuantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minQuantity: Math.max(0, parseInt(e.target.value, 10) || 0),
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Preço de Venda (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Real-time Profit Preview */}
              <div className="rounded-xl border border-white/5 bg-slate-950/50 p-3 flex items-center justify-between text-xs">
                <span className="text-slate-400">Margem e Lucro Estimado:</span>
                <div className="flex items-center gap-3">
                  <span className="text-slate-300">
                    Lucro:{" "}
                    <strong className="text-emerald-400">
                      {calculatedMargin.profit.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </strong>
                  </span>
                  <span className="text-slate-300">
                    Margem:{" "}
                    <strong className="text-cyan-400">
                      {calculatedMargin.marginPercent.toFixed(1)}%
                    </strong>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Peso Unitário (g)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 85"
                    value={formData.weightGrams || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, weightGrams: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Dimensões (C x L x A cm)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 12 x 8 x 6 cm"
                    value={formData.dimensions}
                    onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações / Notas Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais de fabricação ou estoque..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
                >
                  {saving
                    ? "Salvando..."
                    : editingProduct
                      ? "Salvar Alterações"
                      : "Cadastrar Produto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
