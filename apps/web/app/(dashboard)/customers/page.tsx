import { CustomersManager } from "@/components/customers/customers-manager";
import { getCustomersForPage } from "@/lib/server-customers";

export default async function CustomersPage() {
  const { customers, error } = await getCustomersForPage();
  return <CustomersManager initialCustomers={customers} initialError={error} />;
}
