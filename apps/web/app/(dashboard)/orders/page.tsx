import { OrdersManager } from "@/components/orders/orders-manager";
import { getCustomersForPage } from "@/lib/server-customers";
import { getOrdersForPage } from "@/lib/server-orders";

export default async function OrdersPage() {
  const [customersResult, ordersResult] = await Promise.all([
    getCustomersForPage(),
    getOrdersForPage(),
  ]);
  return (
    <OrdersManager
      initialCustomers={customersResult.customers}
      initialOrders={ordersResult.orders}
      initialError={customersResult.error || ordersResult.error}
    />
  );
}
