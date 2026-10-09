import type { ReactNode } from "react";

import type { PublicUser } from "@/lib/auth-types";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  children: ReactNode;
  user: PublicUser;
}

export function AppShell({ children, user }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />

        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}