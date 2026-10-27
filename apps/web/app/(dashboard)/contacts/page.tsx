import { ContactsHubManager } from "@/components/contacts/contacts-hub-manager";
import { getCustomersForPage } from "@/lib/server-customers";
import { getSuppliersForPage } from "@/lib/server-suppliers";
import { getAuthenticatedUser } from "@/lib/server-auth";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const [user, { customers, error: custErr }, { suppliers, error: suppErr }, sp] =
    await Promise.all([
      getAuthenticatedUser(),
      getCustomersForPage(),
      getSuppliersForPage(),
      searchParams,
    ]);

  return (
    <ContactsHubManager
      currentUserRole={user?.role}
      initialCustomers={customers}
      initialSuppliers={suppliers}
      initialCustomerError={custErr}
      initialSupplierError={suppErr}
      defaultTab={sp?.tab || "customers"}
    />
  );
}
