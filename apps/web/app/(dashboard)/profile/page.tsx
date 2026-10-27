import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { getUserProfile, type UserProfileRecord } from "@/lib/server-users";
import { ProfileManager } from "@/components/profile/profile-manager";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const { profile } = await getUserProfile();

  // Se o endpoint completo responder, usa-o; caso contrário, monta a partir dos dados do token de sessão
  const effectiveProfile: UserProfileRecord = profile ?? {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    role: currentUser.role,
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    companyId: currentUser.companyId,
    companyName: currentUser.companyName ?? "Minha Farm",
    companyCreatedAt: null,
  };

  return <ProfileManager initialProfile={effectiveProfile} />;
}
