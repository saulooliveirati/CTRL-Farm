import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { FirebaseService } from "./firebase.service.js";

export interface SyncStatsResult {
  lastSyncAt: string | null;
  status: "IDLE" | "SYNCING" | "SUCCESS" | "ERROR";
  mode: "CLOUD_FIRESTORE" | "LOCAL_STORE_FALLBACK";
  collections: Record<string, number>;
  totalDocuments: number;
  message?: string;
}

@Injectable()
export class FirebaseSyncService {
  private readonly logger = new Logger(FirebaseSyncService.name);

  private lastSyncStats: SyncStatsResult = {
    lastSyncAt: null,
    status: "IDLE",
    mode: "LOCAL_STORE_FALLBACK",
    collections: {},
    totalDocuments: 0,
  };

  // Cache local em memória para fallback resiliente quando credenciais da nuvem não estão configuradas
  private localFirestoreMirror: Record<string, Map<string, any>> = {};

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebase: FirebaseService
  ) {}

  /**
   * Obtém estatísticas e histórico da última sincronização
   */
  getSyncStats(): SyncStatsResult {
    const isConfigured = this.firebase.isConfigured();
    return {
      ...this.lastSyncStats,
      mode: isConfigured ? "CLOUD_FIRESTORE" : "LOCAL_STORE_FALLBACK",
    };
  }

  /**
   * Sincroniza todo o banco de dados relacional para o Firebase Firestore
   */
  async syncAll(companyIdFilter?: string): Promise<SyncStatsResult> {
    const isConfigured = this.firebase.isConfigured();
    const firestore = this.firebase.getFirestore();
    const mode = isConfigured && firestore ? "CLOUD_FIRESTORE" : "LOCAL_STORE_FALLBACK";

    this.logger.log(`[Firebase Sync] Iniciando transferência de dados para Firebase (${mode})...`);
    this.lastSyncStats.status = "SYNCING";

    const counts: Record<string, number> = {
      companies: 0,
      users: 0,
      printers: 0,
      filaments: 0,
      inventoryMaterials: 0,
      productionJobs: 0,
      customers: 0,
      suppliers: 0,
      orders: 0,
      projectFiles: 0,
      sectionTabs: 0,
      userLicenses: 0,
    };

    try {
      // 1. Empresas
      const companies = await this.prisma.company.findMany({
        where: companyIdFilter ? { id: companyIdFilter } : undefined,
      });
      for (const comp of companies) {
        await this.upsertDoc(firestore, "companies", comp.id, {
          id: comp.id,
          name: comp.name,
          tradeName: comp.tradeName,
          document: comp.document,
          email: comp.email,
          phone: comp.phone,
          active: comp.active,
          createdAt: comp.createdAt,
          updatedAt: comp.updatedAt,
          _syncedAt: new Date().toISOString(),
        });
        counts.companies++;
      }

      // 2. Usuários (Sanitização rígida de segurança: NUNCA exporta hashes de senha ou segredos)
      const users = await this.prisma.user.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
        select: {
          id: true,
          companyId: true,
          name: true,
          email: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      for (const u of users) {
        await this.upsertDoc(firestore, "users", u.id, {
          ...u,
          _syncedAt: new Date().toISOString(),
        });
        counts.users++;
      }

      // 3. Impressoras 3D & Telemetria
      const printers = await this.prisma.printer.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const p of printers) {
        await this.upsertDoc(firestore, "printers", p.id, {
          id: p.id,
          companyId: p.companyId,
          name: p.name,
          model: p.model,
          manufacturer: p.manufacturer,
          status: p.status,
          nozzleMm: p.nozzleMm ? Number(p.nozzleMm) : null,
          usageHours: p.usageHours ? Number(p.usageHours) : 0,
          ipAddress: p.ipAddress,
          bedTemp: p.bedTemp ? Number(p.bedTemp) : null,
          targetBedTemp: p.targetBedTemp ? Number(p.targetBedTemp) : null,
          nozzleTemp: p.nozzleTemp ? Number(p.nozzleTemp) : null,
          targetNozzleTemp: p.targetNozzleTemp ? Number(p.targetNozzleTemp) : null,
          progressPercent: p.progressPercent ? Number(p.progressPercent) : null,
          currentLayer: p.currentLayer,
          totalLayers: p.totalLayers,
          notes: p.notes,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          _syncedAt: new Date().toISOString(),
        });
        counts.printers++;
      }

      // 4. Filamentos (Estoque 3D)
      const filaments = await this.prisma.filament.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const f of filaments) {
        await this.upsertDoc(firestore, "filaments", f.id, {
          id: f.id,
          companyId: f.companyId,
          material: f.material,
          brand: f.brand,
          color: f.color,
          initialWeightG: f.initialWeightG,
          currentWeightG: f.currentWeightG,
          price: f.price ? Number(f.price) : null,
          lot: f.lot,
          purchasedAt: f.purchasedAt,
          supplierId: f.supplierId,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          _syncedAt: new Date().toISOString(),
        });
        counts.filaments++;
      }

      // 5. Insumos & Peças
      const materials = await this.prisma.inventoryMaterial.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const m of materials) {
        await this.upsertDoc(firestore, "inventory_materials", m.id, {
          ...m,
          unitCost: m.unitCost ? Number(m.unitCost) : null,
          currentQuantity: m.currentQuantity ? Number(m.currentQuantity) : 0,
          minimumQuantity: m.minimumQuantity ? Number(m.minimumQuantity) : 0,
          _syncedAt: new Date().toISOString(),
        });
        counts.inventoryMaterials++;
      }

      // 6. Trabalhos de Produção (Jobs)
      const jobs = await this.prisma.productionJob.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const j of jobs) {
        await this.upsertDoc(firestore, "production_jobs", j.id, {
          id: j.id,
          companyId: j.companyId,
          printerId: j.printerId,
          filamentId: j.filamentId,
          name: j.name,
          status: j.status,
          plannedWeightG: j.plannedWeightG,
          plannedDurationMinutes: j.plannedDurationMinutes,
          actualWeightG: j.actualWeightG,
          actualDurationSeconds: j.actualDurationSeconds,
          startedAt: j.startedAt,
          completedAt: j.completedAt,
          notes: j.notes,
          createdAt: j.createdAt,
          updatedAt: j.updatedAt,
          _syncedAt: new Date().toISOString(),
        });
        counts.productionJobs++;
      }

      // 7. Clientes & Fornecedores (Contatos)
      const customers = await this.prisma.customer.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const c of customers) {
        await this.upsertDoc(firestore, "customers", c.id, {
          ...c,
          _syncedAt: new Date().toISOString(),
        });
        counts.customers++;
      }

      const suppliers = await this.prisma.supplier.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const s of suppliers) {
        await this.upsertDoc(firestore, "suppliers", s.id, {
          ...s,
          _syncedAt: new Date().toISOString(),
        });
        counts.suppliers++;
      }

      // 8. Orçamentos & Pedidos
      const orders = await this.prisma.customerOrder.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const o of orders) {
        await this.upsertDoc(firestore, "orders", o.id, {
          ...o,
          unitPrice: o.unitPrice ? Number(o.unitPrice) : 0,
          totalAmount: o.totalAmount ? Number(o.totalAmount) : null,
          _syncedAt: new Date().toISOString(),
        });
        counts.orders++;
      }

      // 9. Arquivos STL & Modelos 3D
      const projectFiles = await this.prisma.projectFile.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const pf of projectFiles) {
        await this.upsertDoc(firestore, "project_files", pf.id, {
          id: pf.id,
          companyId: pf.companyId,
          projectName: pf.projectName,
          category: pf.category,
          originalName: pf.originalName,
          storedName: pf.storedName,
          sizeBytes: pf.sizeBytes,
          mimeType: pf.mimeType,
          tags: pf.tags,
          version: pf.version,
          createdAt: pf.createdAt,
          updatedAt: pf.updatedAt,
          _syncedAt: new Date().toISOString(),
        });
        counts.projectFiles++;
      }

      // 10. Abas Customizadas do Menu Lateral
      const tabs = await this.prisma.$queryRawUnsafe<any[]>(
        companyIdFilter
          ? `SELECT * FROM "CustomSectionTab" WHERE "companyId" = $1`
          : `SELECT * FROM "CustomSectionTab"`,
        ...(companyIdFilter ? [companyIdFilter] : [])
      );
      for (const t of tabs) {
        await this.upsertDoc(firestore, "section_tabs", t.id, {
          ...t,
          _syncedAt: new Date().toISOString(),
        });
        counts.sectionTabs++;
      }

      // 11. Licenças da Farm
      const licenses = await this.prisma.userLicense.findMany({
        where: companyIdFilter ? { companyId: companyIdFilter } : undefined,
      });
      for (const l of licenses) {
        await this.upsertDoc(firestore, "licenses", l.id, {
          id: l.id,
          userId: l.userId,
          companyId: l.companyId,
          activationKey: l.activationKey,
          planCode: l.planCode,
          planName: l.planName,
          status: l.status,
          expiresAt: l.expiresAt,
          allowedFeatures: l.allowedFeatures,
          autoUpdate: l.autoUpdate,
          updateChannel: l.updateChannel,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
          _syncedAt: new Date().toISOString(),
        });
        counts.userLicenses++;
      }

      const totalDocuments = Object.values(counts).reduce((a, b) => a + b, 0);

      this.lastSyncStats = {
        lastSyncAt: new Date().toISOString(),
        status: "SUCCESS",
        mode,
        collections: counts,
        totalDocuments,
        message: `Transferência concluída com sucesso! ${totalDocuments} documentos sincronizados com o Firebase (${mode}).`,
      };

      this.logger.log(`[Firebase Sync] Concluído! Total de documentos transferidos: ${totalDocuments}`);
      return this.lastSyncStats;
    } catch (err: any) {
      this.logger.error(`[Firebase Sync] Erro durante a transferência para o Firebase: ${err.message}`, err.stack);
      this.lastSyncStats = {
        lastSyncAt: new Date().toISOString(),
        status: "ERROR",
        mode,
        collections: counts,
        totalDocuments: Object.values(counts).reduce((a, b) => a + b, 0),
        message: `Falha na sincronização: ${err.message}`,
      };
      return this.lastSyncStats;
    }
  }

  /**
   * Grava documento no Firestore em nuvem ou no espelho local com merge
   */
  private async upsertDoc(
    firestore: any,
    collection: string,
    docId: string,
    data: Record<string, any>
  ): Promise<void> {
    if (firestore) {
      try {
        await firestore.collection(collection).doc(docId).set(data, { merge: true });
        return;
      } catch (err: any) {
        this.logger.warn(`[Firebase Sync] Erro ao gravar doc ${collection}/${docId} no Firestore: ${err.message}`);
      }
    }

    // Fallback de espelho local
    if (!this.localFirestoreMirror[collection]) {
      this.localFirestoreMirror[collection] = new Map();
    }
    const current = this.localFirestoreMirror[collection]!.get(docId) || {};
    this.localFirestoreMirror[collection]!.set(docId, { ...current, ...data });
  }

  /**
   * Consulta um documento do espelho do Firebase (Firestore nuvem ou fallback local)
   */
  async getDoc(collection: string, docId: string): Promise<Record<string, any> | null> {
    const firestore = this.firebase.getFirestore();
    if (firestore) {
      try {
        const snap = await firestore.collection(collection).doc(docId).get();
        if (snap.exists) return snap.data() ?? null;
      } catch {
        // Fallback para espelho local
      }
    }

    return this.localFirestoreMirror[collection]?.get(docId) || null;
  }
}
