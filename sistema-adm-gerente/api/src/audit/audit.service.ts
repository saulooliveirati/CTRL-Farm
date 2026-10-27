import { Injectable } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: { action?: string; limit?: number }) {
    const limit = Math.min(100, Math.max(1, query?.limit ?? 50));
    const where: any = {};
    if (query?.action) {
      where.action = query.action;
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        adminUser: { select: { username: true, name: true, role: true } },
        client: { select: { name: true, email: true } },
      },
    });
  }

  async record(data: {
    action: string;
    performedBy: string;
    adminUserId?: string;
    clientId?: string;
    targetType?: string;
    targetId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: any;
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        performedBy: data.performedBy,
        adminUserId: data.adminUserId || null,
        clientId: data.clientId || null,
        targetType: data.targetType || "SYSTEM",
        targetId: data.targetId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        details: data.details || null,
      },
    });
  }
}
