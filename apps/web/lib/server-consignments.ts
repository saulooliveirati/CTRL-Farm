export type ConsignmentPartner = {
  id: string;
  companyId: string;
  name: string;
  corporateName?: string | null;
  tradeName?: string | null;
  responsibleName: string;
  phone: string;
  whatsapp?: string | null;
  email?: string | null;
  document?: string | null;
  zipCode?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  instagram?: string | null;
  facebook?: string | null;
  googleMapsUrl?: string | null;
  logoUrl?: string | null;
  photos?: string[];
  defaultCommissionType: "PERCENTAGE" | "FIXED";
  defaultCommissionRate: number;
  notes?: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
  updatedAt: string;
  _count?: {
    consignments?: number;
    stocks?: number;
    sales?: number;
  };
};

export type ConsignmentStockItem = {
  id: string;
  companyId: string;
  locationId: string;
  location: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  productId?: string | null;
  productName: string;
  sku?: string | null;
  quantityAvailable: number;
  quantitySold: number;
  quantityReturned: number;
  quantityDamaged: number;
  costPrice: number;
  sellingPrice: number;
  createdAt: string;
  updatedAt: string;
};

export type ConsignmentShipmentItem = {
  id: string;
  productId?: string | null;
  productName: string;
  sku?: string | null;
  quantity: number;
  costPrice: number;
  suggestedPrice: number;
  salePrice: number;
  minPrice?: number | null;
  commissionRate?: number | null;
  commissionFixed?: number | null;
  notes?: string | null;
};

export type ConsignmentShipment = {
  id: string;
  companyId: string;
  code: string;
  locationId: string;
  location: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  sentAt: string;
  status: "DRAFT" | "SENT" | "DELIVERED" | "CANCELLED";
  totalCost: number;
  totalSuggestedValue: number;
  totalSaleValue: number;
  notes?: string | null;
  items: ConsignmentShipmentItem[];
  createdAt: string;
  updatedAt: string;
};

export type ConsignmentSale = {
  id: string;
  companyId: string;
  locationId: string;
  location: {
    id: string;
    name: string;
  };
  productId?: string | null;
  productName: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  grossAmount: number;
  netAmount: number;
  partnerCommission: number;
  farmRevenue: number;
  costAmount: number;
  netProfit: number;
  soldAt: string;
  settlementId?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type ConsignmentSettlement = {
  id: string;
  companyId: string;
  code: string;
  locationId: string;
  location: {
    id: string;
    name: string;
    phone: string;
    whatsapp?: string | null;
  };
  startDate: string;
  endDate: string;
  dueDate: string;
  totalGrossSales: number;
  totalPartnerCommission: number;
  totalFarmRevenue: number;
  totalPaid: number;
  balanceDue: number;
  status: "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  payments: ConsignmentPayment[];
  sales?: ConsignmentSale[];
};

export type ConsignmentPayment = {
  id: string;
  settlementId: string;
  amount: number;
  method: "PIX" | "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "BANK_TRANSFER";
  paidAt: string;
  transactionReference?: string | null;
  status: "RECEIVED" | "PENDING" | "CANCELLED";
  notes?: string | null;
  createdAt: string;
};

export type ConsignmentMovement = {
  id: string;
  companyId: string;
  locationId: string;
  location: {
    id: string;
    name: string;
  };
  productId?: string | null;
  productName: string;
  sku?: string | null;
  type: "ENVIO" | "VENDA" | "DEVOLUCAO" | "PERDA" | "AVARIA" | "AJUSTE" | "TRANSFERENCIA";
  quantity: number;
  previousBalance: number;
  newBalance: number;
  unitValue: number;
  totalValue: number;
  reason?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  createdAt: string;
};

export type ConsignmentDashboardMetrics = {
  overview?: {
    totalPartners: number;
    activePartners: number;
    productsInConsignment: number;
    totalCostInConsignment: number;
    totalValueInConsignment: number;
    productsSold: number;
    productsReturned: number;
    productsDamaged: number;
    totalGrossSales: number;
    totalCommissions: number;
    totalFarmRevenue: number;
    totalNetProfit: number;
    totalToReceive: number;
    totalReceived: number;
    overdueSettlementsCount: number;
  };
  totalPartners?: number;
  activePartners?: number;
  productsInConsignment?: number;
  totalCostInConsignment?: number;
  totalValueInConsignment?: number;
  productsSold?: number;
  productsReturned?: number;
  productsDamaged?: number;
  totalGrossSales?: number;
  totalCommissions?: number;
  totalFarmRevenue?: number;
  totalNetProfit?: number;
  totalToReceive?: number;
  totalReceived?: number;
  overdueSettlementsCount?: number;
  topPartners: Array<{
    id: string;
    name: string;
    totalRevenue: number;
    itemsSold: number;
  }>;
  topProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  alerts: Array<{
    type: "LOW_STOCK" | "STAGNANT" | "OVERDUE" | "HIGH_RETURN";
    severity: "WARNING" | "CRITICAL" | "INFO";
    title: string;
    description: string;
    locationId?: string;
  }>;
};
