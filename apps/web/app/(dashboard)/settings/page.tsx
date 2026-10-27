import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { getCompanyDetails } from "@/lib/server-companies";
import { getCompanyUsers } from "@/lib/server-users";
import { SettingsManager } from "@/components/settings/settings-manager";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const [{ users }, { company }, sp] = await Promise.all([
    getCompanyUsers(),
    getCompanyDetails(),
    searchParams,
  ]);

  return (
    <SettingsManager
      initialUsers={users}
      initialCompany={company}
      currentUser={currentUser}
      defaultTab={sp?.tab || "company"}
    />
  );
}
