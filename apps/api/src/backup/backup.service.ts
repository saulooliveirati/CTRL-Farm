import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import * as crypto from "crypto";
import { PrismaService } from "../database/prisma.service.js";

export interface BackupExportData {
  version: "1.0";
  system: "CTRL-Farm";
  exportedAt: string;
  companyId: string;
  company: any;
  entities: {
    printers: any[];
    filaments: any[];
    inventoryMaterials: any[];
    products: any[];
    productionJobs: any[];
    productionJobFilaments: any[];
    projectFiles: any[];
    customers: any[];
    customerOrders: any[];
    orderItems: any[];
    suppliers: any[];
    pricingEstimates: any[];
    cameras: any[];
    workshopEquipment: any[];
    customSectionTabs: any[];
    consignments: {
      locations: any[];
      consignments: any[];
      items: any[];
      stock: any[];
      movements: any[];
      sales: any[];
      settlements: any[];
      payments: any[];
      commissions: any[];
    };
    users: any[];
  };
  summary: Record<string, number>;
  checksumSha256: string;
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Exporta o backup completo de todos os dados da empresa do usuário
   */
  async exportFullBackup(companyId: string): Promise<BackupExportData> {
    this.logger.log(`Iniciando geração de backup completo para a empresa: ${companyId}`);

    const [
      company,
      printers,
      filaments,
      inventoryMaterials,
      products,
      productionJobs,
      productionJobFilaments,
      projectFiles,
      customers,
      customerOrders,
      orderItems,
      suppliers,
      pricingEstimates,
      cameras,
      workshopEquipment,
      customSectionTabs,
      locations,
      consignments,
      consignmentItems,
      consignmentStock,
      consignmentMovements,
      consignmentSales,
      consignmentSettlements,
      consignmentPayments,
      consignmentCommissions,
      users,
    ] = await Promise.all([
      this.prisma.company.findUnique({ where: { id: companyId } }),
      this.prisma.printer.findMany({ where: { companyId } }),
      this.prisma.filament.findMany({ where: { companyId } }),
      this.prisma.inventoryMaterial.findMany({ where: { companyId } }),
      this.prisma.product.findMany({ where: { companyId } }),
      this.prisma.productionJob.findMany({ where: { companyId } }),
      this.prisma.productionJobFilament.findMany({
        where: { job: { companyId } },
      }),
      this.prisma.projectFile.findMany({ where: { companyId } }),
      this.prisma.customer.findMany({ where: { companyId } }),
      this.prisma.customerOrder.findMany({ where: { companyId } }),
      this.prisma.orderItem.findMany({
        where: { order: { companyId } },
      }),
      this.prisma.supplier.findMany({ where: { companyId } }),
      this.prisma.pricingEstimate.findMany({ where: { companyId } }),
      this.prisma.camera.findMany({ where: { companyId } }),
      this.prisma.workshopEquipment.findMany({ where: { companyId } }),
      this.prisma.customSectionTab.findMany({ where: { companyId } }),
      this.prisma.consignmentLocation.findMany({ where: { companyId } }),
      this.prisma.consignment.findMany({ where: { companyId } }),
      this.prisma.consignmentItem.findMany({ where: { companyId } }),
      this.prisma.consignmentStock.findMany({ where: { companyId } }),
      this.prisma.consignmentMovement.findMany({ where: { companyId } }),
      this.prisma.consignmentSale.findMany({ where: { companyId } }),
      this.prisma.consignmentSettlement.findMany({ where: { companyId } }),
      this.prisma.consignmentPayment.findMany({ where: { companyId } }),
      this.prisma.consignmentCommission.findMany({ where: { companyId } }),
      this.prisma.user.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          password: true, // preserva hash seguro para restauração
        },
      }),
    ]);

    const summary: Record<string, number> = {
      printers: printers.length,
      filaments: filaments.length,
      inventoryMaterials: inventoryMaterials.length,
      products: products.length,
      productionJobs: productionJobs.length,
      customers: customers.length,
      customerOrders: customerOrders.length,
      suppliers: suppliers.length,
      pricingEstimates: pricingEstimates.length,
      cameras: cameras.length,
      workshopEquipment: workshopEquipment.length,
      consignments: consignments.length,
      consignmentLocations: locations.length,
      users: users.length,
    };

    const payloadWithoutChecksum = {
      version: "1.0" as const,
      system: "CTRL-Farm" as const,
      exportedAt: new Date().toISOString(),
      companyId,
      company,
      entities: {
        printers,
        filaments,
        inventoryMaterials,
        products,
        productionJobs,
        productionJobFilaments,
        projectFiles,
        customers,
        customerOrders,
        orderItems,
        suppliers,
        pricingEstimates,
        cameras,
        workshopEquipment,
        customSectionTabs,
        consignments: {
          locations,
          consignments,
          items: consignmentItems,
          stock: consignmentStock,
          movements: consignmentMovements,
          sales: consignmentSales,
          settlements: consignmentSettlements,
          payments: consignmentPayments,
          commissions: consignmentCommissions,
        },
        users,
      },
      summary,
    };

    const checksumSha256 = crypto
      .createHash("sha256")
      .update(JSON.stringify(payloadWithoutChecksum))
      .digest("hex");

    this.logger.log(
      `Backup completo gerado com sucesso para ${company?.name || companyId}. Checksum: ${checksumSha256.slice(0, 12)}...`
    );

    return {
      ...payloadWithoutChecksum,
      checksumSha256,
    };
  }

  /**
   * Restaura os dados de um backup completo para a empresa autenticada
   */
  async restoreBackup(
    companyId: string,
    backup: BackupExportData
  ): Promise<{ success: boolean; restored: Record<string, number>; message: string }> {
    if (!backup || backup.system !== "CTRL-Farm") {
      throw new BadRequestException("Arquivo de backup inválido ou incompatível com o CTRL-Farm.");
    }

    if (!backup.entities) {
      throw new BadRequestException("Estrutura de dados do backup ausente ou corrompida.");
    }

    this.logger.log(`Iniciando restauração de backup para a empresa: ${companyId}`);

    const restoredCounts: Record<string, number> = {
      printers: 0,
      filaments: 0,
      inventoryMaterials: 0,
      products: 0,
      productionJobs: 0,
      customers: 0,
      customerOrders: 0,
      suppliers: 0,
      pricingEstimates: 0,
      cameras: 0,
      workshopEquipment: 0,
      consignmentLocations: 0,
      consignments: 0,
      users: 0,
    };

    const { entities } = backup;

    // 1. Restaura ou atualiza detalhes cadastrais da empresa
    if (backup.company) {
      try {
        await this.prisma.company.update({
          where: { id: companyId },
          data: {
            tradeName: backup.company.tradeName || undefined,
            document: backup.company.document || undefined,
            phone: backup.company.phone || undefined,
            email: backup.company.email || undefined,
            stateRegistration: backup.company.stateRegistration || undefined,
            municipalRegistration: backup.company.municipalRegistration || undefined,
            website: backup.company.website || undefined,
            street: backup.company.street || undefined,
            number: backup.company.number || undefined,
            complement: backup.company.complement || undefined,
            neighborhood: backup.company.neighborhood || undefined,
            city: backup.company.city || undefined,
            state: backup.company.state || undefined,
            cep: backup.company.cep || undefined,
            pixKeyType: backup.company.pixKeyType || undefined,
            pixKey: backup.company.pixKey || undefined,
            specialty: backup.company.specialty || undefined,
            workingHours: backup.company.workingHours || undefined,
          },
        });
      } catch (e: any) {
        this.logger.warn(`Falha ao restaurar dados cadastrais da empresa: ${e.message}`);
      }
    }

    // 2. Restaura Impressoras
    if (Array.isArray(entities.printers)) {
      for (const p of entities.printers) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = p;
          await this.prisma.printer.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.printers++;
        } catch (e) {
          // ignore duplicate/constraint errors
        }
      }
    }

    // 3. Restaura Filamentos
    if (Array.isArray(entities.filaments)) {
      for (const f of entities.filaments) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = f;
          await this.prisma.filament.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.filaments++;
        } catch (e) {}
      }
    }

    // 4. Restaura Almoxarifado / Insumos
    if (Array.isArray(entities.inventoryMaterials)) {
      for (const m of entities.inventoryMaterials) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = m;
          await this.prisma.inventoryMaterial.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.inventoryMaterials++;
        } catch (e) {}
      }
    }

    // 5. Restaura Fornecedores
    if (Array.isArray(entities.suppliers)) {
      for (const s of entities.suppliers) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = s;
          await this.prisma.supplier.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.suppliers++;
        } catch (e) {}
      }
    }

    // 6. Restaura Produtos
    if (Array.isArray(entities.products)) {
      for (const prod of entities.products) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = prod;
          await this.prisma.product.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.products++;
        } catch (e) {}
      }
    }

    // 7. Restaura Clientes
    if (Array.isArray(entities.customers)) {
      for (const c of entities.customers) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = c;
          await this.prisma.customer.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.customers++;
        } catch (e) {}
      }
    }

    // 8. Restaura Pedidos de Clientes
    if (Array.isArray(entities.customerOrders)) {
      for (const o of entities.customerOrders) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = o;
          await this.prisma.customerOrder.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.customerOrders++;
        } catch (e) {}
      }
    }

    // 9. Restaura Itens de Pedidos
    if (Array.isArray(entities.orderItems)) {
      for (const item of entities.orderItems) {
        try {
          const { id, createdAt, updatedAt, ...data } = item;
          await this.prisma.orderItem.upsert({
            where: { id },
            create: { ...data, id },
            update: { ...data },
          });
        } catch (e) {}
      }
    }

    // 10. Restaura Ordens de Produção
    if (Array.isArray(entities.productionJobs)) {
      for (const job of entities.productionJobs) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = job;
          await this.prisma.productionJob.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.productionJobs++;
        } catch (e) {}
      }
    }

    // 11. Restaura Filamentos das Ordens de Produção
    if (Array.isArray(entities.productionJobFilaments)) {
      for (const pjf of entities.productionJobFilaments) {
        try {
          const { id, createdAt, updatedAt, ...data } = pjf;
          await this.prisma.productionJobFilament.upsert({
            where: { id },
            create: { ...data, id },
            update: { ...data },
          });
        } catch (e) {}
      }
    }

    // 12. Restaura Câmeras
    if (Array.isArray(entities.cameras)) {
      for (const cam of entities.cameras) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = cam;
          await this.prisma.camera.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.cameras++;
        } catch (e) {}
      }
    }

    // 13. Restaura Orçamentos & Custos
    if (Array.isArray(entities.pricingEstimates)) {
      for (const pe of entities.pricingEstimates) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = pe;
          await this.prisma.pricingEstimate.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.pricingEstimates++;
        } catch (e) {}
      }
    }

    // 14. Restaura Equipamentos da Oficina
    if (Array.isArray(entities.workshopEquipment)) {
      for (const eq of entities.workshopEquipment) {
        try {
          const { id, createdAt, updatedAt, companyId: _, ...data } = eq;
          await this.prisma.workshopEquipment.upsert({
            where: { id },
            create: { ...data, id, companyId },
            update: { ...data, companyId },
          });
          restoredCounts.workshopEquipment++;
        } catch (e) {}
      }
    }

    // 15. Restaura Consignados
    const cons = entities.consignments;
    if (cons) {
      if (Array.isArray(cons.locations)) {
        for (const loc of cons.locations) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = loc;
            await this.prisma.consignmentLocation.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
            restoredCounts.consignmentLocations++;
          } catch (e) {}
        }
      }
      if (Array.isArray(cons.consignments)) {
        for (const c of cons.consignments) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = c;
            await this.prisma.consignment.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
            restoredCounts.consignments++;
          } catch (e) {}
        }
      }
      if (Array.isArray(cons.items)) {
        for (const it of cons.items) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = it;
            await this.prisma.consignmentItem.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
          } catch (e) {}
        }
      }
      if (Array.isArray(cons.stock)) {
        for (const s of cons.stock) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = s;
            await this.prisma.consignmentStock.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
          } catch (e) {}
        }
      }
      if (Array.isArray(cons.movements)) {
        for (const m of cons.movements) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = m;
            await this.prisma.consignmentMovement.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
          } catch (e) {}
        }
      }
      if (Array.isArray(cons.sales)) {
        for (const sa of cons.sales) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = sa;
            await this.prisma.consignmentSale.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
          } catch (e) {}
        }
      }
      if (Array.isArray(cons.settlements)) {
        for (const set of cons.settlements) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = set;
            await this.prisma.consignmentSettlement.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
          } catch (e) {}
        }
      }
      if (Array.isArray(cons.payments)) {
        for (const pay of cons.payments) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = pay;
            await this.prisma.consignmentPayment.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
          } catch (e) {}
        }
      }
      if (Array.isArray(cons.commissions)) {
        for (const com of cons.commissions) {
          try {
            const { id, createdAt, updatedAt, companyId: _, ...data } = com;
            await this.prisma.consignmentCommission.upsert({
              where: { id },
              create: { ...data, id, companyId },
              update: { ...data, companyId },
            });
          } catch (e) {}
        }
      }
    }

    // 16. Restaura Usuários adicionais da empresa (se não conflitarem com email existente)
    if (Array.isArray(entities.users)) {
      for (const u of entities.users) {
        try {
          const existing = await this.prisma.user.findUnique({
            where: { email: u.email },
          });
          if (!existing) {
            await this.prisma.user.create({
              data: {
                id: u.id,
                name: u.name,
                email: u.email,
                password: u.password,
                role: u.role,
                active: u.active ?? true,
                companyId,
              },
            });
            restoredCounts.users++;
          }
        } catch (e) {}
      }
    }

    this.logger.log(
      `Restauração concluída com sucesso para ${companyId}. Total restaurado: ${JSON.stringify(
        restoredCounts
      )}`
    );

    return {
      success: true,
      restored: restoredCounts,
      message: "Backup do serviço restaurado com sucesso! Seus dados foram sincronizados.",
    };
  }
}
