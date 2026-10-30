// ==============================================================================
// Tela de Marketplaces & Pedidos — CTRL Farm Manager Mobile
// Canais integrados (Shopee, Mercado Livre, Loja Própria, B2B), estoque e produtos em alta
// ==============================================================================

'use client';

import React from 'react';
import { IOSCard } from '../ios-card';
import { IOSSegmentedControl } from '../ios-segmented-control';
import { useMobileMarketplace, ChannelType } from '@/hooks/mobile/use-mobile-marketplace';
import { ShoppingBag, Package, TrendingUp, CheckCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';

export function MarketplaceView() {
  const { orders, allOrders, products, selectedChannel, setSelectedChannel } =
    useMobileMarketplace();

  const channelBadges = {
    SHOPEE: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    MERCADO_LIVRE: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOJA_PROPRIA: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    B2B: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'AGUARDANDO_APROVACAO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Aguardando Aprovação
          </span>
        );
      case 'EM_PRODUCAO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Em Produção
          </span>
        );
      case 'PRONTO_ENVIO':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            <Package className="w-3 h-3" />
            Pronto para Envio
          </span>
        );
      case 'ENVIADO':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Despachado
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 px-4 pt-2">
      
      {/* Filtro de Canais */}
      <IOSSegmentedControl
        options={[
          { value: 'ALL', label: 'Todos', badge: allOrders.length },
          { value: 'SHOPEE', label: 'Shopee' },
          { value: 'MERCADO_LIVRE', label: 'ML' },
          { value: 'B2B', label: 'B2B' },
        ]}
        value={selectedChannel}
        onChange={(val) => setSelectedChannel(val as any)}
        size="sm"
      />

      {/* Lista de Pedidos */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
            Pedidos Recentes ({orders.length})
          </span>
          <span className="text-[11px] text-slate-400">Sincronização em tempo real</span>
        </div>

        {orders.map((order) => (
          <IOSCard key={order.id} variant="surface" className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg border ${
                    channelBadges[order.channel]
                  }`}
                >
                  {order.channel}
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-xs">
                  {order.orderNumber}
                </span>
              </div>
              <div>{getOrderStatusBadge(order.status)}</div>
            </div>

            <div className="text-xs">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {order.customerName}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {order.itemsCount}x {order.productSummary}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">{order.createdAt}</span>
              <div className="font-mono font-extrabold text-slate-900 dark:text-white text-sm">
                R$ {order.totalAmount.toFixed(2)}
              </div>
            </div>
          </IOSCard>
        ))}
      </div>

      {/* Produtos em Alta (Trending Products) & Estoque Sincronizado */}
      <div className="pt-2 space-y-3">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-brand-neon" />
            <span>Produtos em Alta (Mais Vendidos)</span>
          </span>
          <span className="text-[11px] text-brand-neon font-bold">Estoque Sync</span>
        </div>

        <div className="space-y-2.5">
          {products.map((prod) => (
            <IOSCard key={prod.id} variant="surface" className="flex items-center gap-3 p-3">
              <img
                src={prod.thumbnailUrl}
                alt={prod.title}
                className="w-14 h-14 rounded-2xl object-cover bg-slate-800 shrink-0 border border-slate-200/60 dark:border-white/10"
              />
              <div className="flex-1 min-w-0 text-xs">
                <div className="font-bold text-slate-900 dark:text-white truncate">
                  {prod.title}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {prod.category} • {prod.salesLast30Days} vendas/mês
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold text-slate-900 dark:text-brand-neon">
                    R$ {prod.price.toFixed(2)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      prod.status === 'LOW_STOCK'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {prod.stockQty} un. em estoque
                  </span>
                </div>
              </div>
            </IOSCard>
          ))}
        </div>
      </div>

    </div>
  );
}
