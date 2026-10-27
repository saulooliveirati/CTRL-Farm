import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics() {
    const now = new Date();
    const in30Days = new Date(now);
    in30Days.setDate(in30Days.getDate() + 30);

    const in24HoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      activeClientsCount,
      totalClientsCount,
      activeSubscriptions,
      allSubscriptions,
      expiringLicenses,
      latestRelease,
      recentlyActiveInstances,
      recentLicenses,
      recentSubscriptions,
      recentAuditLogs,
    ] = await Promise.all([
      this.prisma.client.count({ where: { status: "ACTIVE" } }),
      this.prisma.client.count(),
      this.prisma.subscription.findMany({
        where: { status: "ATIVO" },
        include: { plan: true },
      }),
      this.prisma.subscription.groupBy({
        by: ["planId"],
        _count: { id: true },
      }),
      this.prisma.license.findMany({
        where: {
          status: "ACTIVE",
          expiresAt: { lte: in30Days, gte: now },
        },
        include: { client: true, plan: true },
      }),
      this.prisma.updateRelease.findFirst({
        where: { status: "PUBLISHED" },
        orderBy: { releaseDate: "desc" },
      }),
      this.prisma.license.count({
        where: {
          status: "ACTIVE",
          lastValidatedAt: { gte: in24HoursAgo },
        },
      }),
      this.prisma.license.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { client: true, plan: true },
      }),
      this.prisma.subscription.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { client: true, plan: true },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        include: { adminUser: true, client: true },
      }),
    ]);

    // Cálculo do MRR (Receita Recorrente Mensal)
    let mrr = 0;
    const plansDistribution: Record<string, { name: string; count: number; revenue: number }> = {};

    for (const sub of activeSubscriptions) {
      const price = Number(sub.currentPrice);
      let monthlyEquivalent = price;

      if (sub.billingCycle === "QUARTERLY") {
        monthlyEquivalent = price / 3;
      } else if (sub.billingCycle === "ANNUAL") {
        monthlyEquivalent = price / 12;
      }

      mrr += monthlyEquivalent;

      const code = sub.plan.code;
      if (!plansDistribution[code]) {
        plansDistribution[code] = {
          name: sub.plan.name,
          count: 0,
          revenue: 0,
        };
      }
      plansDistribution[code].count += 1;
      plansDistribution[code].revenue += monthlyEquivalent;
    }

    return {
      kpis: {
        activeClients: activeClientsCount,
        totalClients: totalClientsCount,
        monthlyRecurringRevenue: Number(mrr.toFixed(2)),
        plansSold: activeSubscriptions.length,
        expiringLicensesCount: expiringLicenses.length,
        latestVersion: latestRelease?.version || "v2.5.0",
        connectedUsersCount: Math.max(recentlyActiveInstances, activeClientsCount),
      },
      plansDistribution,
      expiringLicenses: expiringLicenses.map((l) => ({
        id: l.id,
        activationKey: l.activationKey,
        clientName: l.client.name,
        planName: l.plan.name,
        expiresAt: l.expiresAt,
        daysRemaining: Math.max(0, Math.ceil((new Date(l.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
      })),
      recentLicenses,
      recentSubscriptions,
      recentAuditLogs,
    };
  }
}
