import { AiFarmChat } from "@/components/ai-farm/ai-farm-chat";
import { getCurrentUser } from "@/lib/server-auth";

export default async function AiFarmPage() {
  const user = await getCurrentUser();
  return <AiFarmChat user={user} canManage={user?.role === "ADMIN" || user?.role === "MANAGER"} />;
}
