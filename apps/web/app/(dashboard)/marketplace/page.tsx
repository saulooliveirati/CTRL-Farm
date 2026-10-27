import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server-auth";
import { getMarketplaceDataForPage } from "@/lib/server-marketplace";
import { MarketplaceManager } from "@/components/marketplace/marketplace-manager";

export const metadata = {
  title: "Marketplace Intelligence | CTRL+Farm",
  description:
    "Monitoramento diário e inteligência de mercado de produtos 3D na Shopee, Mercado Livre e TikTok Shop.",
};

export default async function MarketplacePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { products, metrics, error } = await getMarketplaceDataForPage();

  return (
    <div className="space-y-6">
      <MarketplaceManager
        initialProducts={products}
        initialMetrics={metrics}
        initialError={error}
      />
    </div>
  );
}
