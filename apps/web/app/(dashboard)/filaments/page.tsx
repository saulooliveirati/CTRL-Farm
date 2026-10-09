import { FilamentsManager } from "@/components/filaments/filaments-manager";
import { getFilamentsForPage } from "@/lib/server-filaments";

export default async function FilamentsPage() {
  const { filaments, error } = await getFilamentsForPage();
  return <FilamentsManager initialFilaments={filaments} initialError={error} />;
}
