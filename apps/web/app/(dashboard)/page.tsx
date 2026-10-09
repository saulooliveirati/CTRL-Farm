import Link from "next/link";

import { getPrintersForPage } from "@/lib/server-printers";
import { getFilamentsForPage } from "@/lib/server-filaments";
import { getProductionForPage } from "@/lib/server-production";
import { getOrdersForPage } from "@/lib/server-orders";

const stats = [
  {
    title: "Impressoras online",
    value: "0",
    description: "Nenhuma conectada ainda",
  },
  {
    title: "Ordens em andamento",
    value: "0",
    description: "Nenhuma produção registrada",
  },
  {
    title: "Pedidos pendentes",
    value: "0",
    description: "Nenhum pedido pendente",
  },
  {
    title: "Filamentos",
    value: "0 kg",
    description: "Estoque cadastrado",
  },
];

export default async function DashboardPage() {
  const [{ printers }, { filaments }, { jobs }, { orders }] = await Promise.all([
    getPrintersForPage(), getFilamentsForPage(), getProductionForPage(), getOrdersForPage(),
  ]);
  const onlinePrinters = printers.filter((printer) =>
    ["READY", "PRINTING", "PAUSED"].includes(printer.status),
  ).length;
  const filamentStockKg = filaments.reduce((total, item) => total + item.currentWeightG, 0) / 1000;
  const activeJobs = jobs.filter((job) => ["QUEUED", "PRINTING", "PAUSED"].includes(job.status));
  const pendingOrders = orders.filter((order) => order.status === "DRAFT" || order.status === "IN_PRODUCTION");
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-bold tracking-tight">Visão geral</h2>
        <p className="text-muted-foreground">
          Acompanhe a operação da sua fazenda de impressão.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border bg-background p-5 shadow-sm"
          >
            <div className="text-sm text-muted-foreground">{stat.title}</div>
            <div className="mt-2 text-3xl font-bold">{stat.title === "Impressoras online" ? onlinePrinters : stat.title === "Filamentos" ? `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(filamentStockKg)} kg` : stat.title === "Ordens em andamento" ? activeJobs.length : stat.title === "Pedidos pendentes" ? pendingOrders.length : stat.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {stat.title === "Impressoras online" ? `${printers.length} cadastradas` : stat.title === "Filamentos" ? `${filaments.length} bobinas cadastradas` : stat.title === "Ordens em andamento" ? `${jobs.filter((job) => job.status === "QUEUED").length} na fila` : stat.description}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-xl border bg-background p-6 shadow-sm">
        <h3 className="font-semibold">Produção em andamento</h3>
        <p className="text-sm text-muted-foreground">
          {activeJobs.length === 0 ? "Nenhuma ordem ativa no momento." : `${activeJobs.length} ordem(ns) aguardando ou em execução.`}
        </p>
        <div className="mt-8 flex min-h-40 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">{activeJobs.length === 0 ? "Crie uma ordem para acompanhar a produção e o consumo de filamento." : activeJobs.map((job) => `${job.name} · ${job.printer.name} · ${job.status === "QUEUED" ? "Na fila" : job.status === "PAUSED" ? "Pausada" : "Imprimindo"}`).join(" | ")}</p>
            <Link href="/production" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">Abrir produção</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
