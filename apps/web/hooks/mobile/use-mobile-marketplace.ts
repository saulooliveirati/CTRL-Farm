// ==============================================================================
// Hook de Marketplaces & Pedidos — CTRL Farm Manager Mobile
// Integração multicanal (Shopee, Mercado Livre, Loja Própria e B2B)
// ==============================================================================

'use client';

import { useState } from 'react';

export type ChannelType = 'SHOPEE' | 'MERCADO_LIVRE' | 'LOJA_PROPRIA' | 'B2B';

export interface MobileMarketplaceOrder {
  id: string;
  orderNumber: string;
  channel: ChannelType;
  customerName: string;
  totalAmount: number;
  itemsCount: number;
  productSummary: string;
  status: 'AGUARDANDO_APROVACAO' | 'EM_PRODUCAO' | 'PRONTO_ENVIO' | 'ENVIADO';
  createdAt: string;
  urgent: boolean;
}

export interface MobileMarketplaceProduct {
  id: string;
  title: string;
  category: string;
  price: number;
  stockQty: number;
  minStockAlert: number;
  activeChannels: ChannelType[];
  salesLast30Days: number;
  status: 'SYNCED' | 'LOW_STOCK' | 'PAUSED';
  thumbnailUrl: string;
}

export function useMobileMarketplace() {
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | 'ALL'>('ALL');

  const orders: MobileMarketplaceOrder[] = [
    {
      id: 'ord-01',
      orderNumber: '#SHP-2026-9921',
      channel: 'SHOPEE',
      customerName: 'Renato Faria',
      totalAmount: 189.90,
      itemsCount: 3,
      productSummary: 'Suporte Articulado para Fone Gamer (Preto)',
      status: 'EM_PRODUCAO',
      createdAt: 'Hoje, 14:22',
      urgent: false,
    },
    {
      id: 'ord-02',
      orderNumber: '#MLB-88492019',
      channel: 'MERCADO_LIVRE',
      customerName: 'Dra. Carolina Mendes',
      totalAmount: 1250.00,
      itemsCount: 10,
      productSummary: 'Modelos Anatômicos Didáticos Esqueleto Canino',
      status: 'AGUARDANDO_APROVACAO',
      createdAt: 'Hoje, 15:40',
      urgent: true,
    },
    {
      id: 'ord-03',
      orderNumber: '#DIR-10294',
      channel: 'LOJA_PROPRIA',
      customerName: 'Studio Arquitetura Alfa',
      totalAmount: 640.00,
      itemsCount: 2,
      productSummary: 'Luminária Geométrica Voronoi em PLA Mármore',
      status: 'PRONTO_ENVIO',
      createdAt: 'Hoje, 11:15',
      urgent: false,
    },
    {
      id: 'ord-04',
      orderNumber: '#B2B-4402',
      channel: 'B2B',
      customerName: 'Indústria Metalprint',
      totalAmount: 4800.00,
      itemsCount: 50,
      productSummary: 'Bucha de Precisão Nylon PA12 Auto-lubrificante',
      status: 'AGUARDANDO_APROVACAO',
      createdAt: 'Ontem, 18:05',
      urgent: true,
    },
    {
      id: 'ord-05',
      orderNumber: '#MLB-88491040',
      channel: 'MERCADO_LIVRE',
      customerName: 'Lucas Albuquerque',
      totalAmount: 95.00,
      itemsCount: 1,
      productSummary: 'Case Protetora Raspberry Pi 5 com Cooler 40mm',
      status: 'ENVIADO',
      createdAt: 'Ontem, 16:30',
      urgent: false,
    },
  ];

  const products: MobileMarketplaceProduct[] = [
    {
      id: 'prd-01',
      title: 'Suporte Articulado para Headset / Fone Gamer',
      category: 'Acessórios Tech',
      price: 64.90,
      stockQty: 24,
      minStockAlert: 10,
      activeChannels: ['SHOPEE', 'MERCADO_LIVRE', 'LOJA_PROPRIA'],
      salesLast30Days: 142,
      status: 'SYNCED',
      thumbnailUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=200&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd-02',
      title: 'Luminária Geométrica Voronoi Minimalista',
      category: 'Decoração',
      price: 189.00,
      stockQty: 4,
      minStockAlert: 8,
      activeChannels: ['MERCADO_LIVRE', 'LOJA_PROPRIA'],
      salesLast30Days: 68,
      status: 'LOW_STOCK',
      thumbnailUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=200&auto=format&fit=crop&q=80',
    },
    {
      id: 'prd-03',
      title: 'Engrenagens Planetárias para Robótica Educacional',
      category: 'Engenharia / Maker',
      price: 34.50,
      stockQty: 110,
      minStockAlert: 30,
      activeChannels: ['SHOPEE', 'LOJA_PROPRIA', 'B2B'],
      salesLast30Days: 310,
      status: 'SYNCED',
      thumbnailUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=80',
    },
  ];

  const filteredOrders =
    selectedChannel === 'ALL'
      ? orders
      : orders.filter((o) => o.channel === selectedChannel);

  return {
    orders: filteredOrders,
    allOrders: orders,
    products,
    selectedChannel,
    setSelectedChannel,
  };
}
