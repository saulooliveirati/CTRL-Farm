import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { ProjectFilesManager } from "@/components/project-files/project-files-manager";

export default async function ProjectFilesPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const sp = await searchParams;

  return (
    <ProjectFilesManager
      currentUserRole={currentUser.role}
      currentUserName={currentUser.name}
      defaultTab={sp?.tab || "all"}
    />
  );
}
