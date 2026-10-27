import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/server-auth";
import { getLicensingStatus } from "@/lib/server-licensing";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const licensingStatus = await getLicensingStatus();

  return (
    <AppShell user={user} initialLicensing={licensingStatus}>
      {children}
    </AppShell>
  );
}
