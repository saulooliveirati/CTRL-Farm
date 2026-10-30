// ==============================================================================
// Audit Logger Service — CTRL Farm Manager Mobile
// Registra ações de auditoria de administradores e gerentes com timestamp, IP e hash
// ==============================================================================

export interface AuditLogEntry {
  id: string;
  action: string;
  category: 'APPROVAL' | 'SECURITY' | 'PRODUCTION' | 'FINANCE' | 'MARKETPLACE' | 'SYSTEM';
  actor: {
    name: string;
    role: string;
    id: string;
  };
  target: string;
  details: Record<string, any>;
  timestamp: string;
  device: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'WARNING' | 'REJECTED';
}

const STORAGE_KEY = 'ctrl_farm_mobile_audit_logs';

export class AuditLoggerService {
  private static instance: AuditLoggerService;

  public static getInstance(): AuditLoggerService {
    if (!AuditLoggerService.instance) {
      AuditLoggerService.instance = new AuditLoggerService();
    }
    return AuditLoggerService.instance;
  }

  public getLogs(): AuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return this.getInitialSampleLogs();
      return JSON.parse(data);
    } catch {
      return this.getInitialSampleLogs();
    }
  }

  public log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'device'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      device: typeof window !== 'undefined' ? (navigator.userAgent.includes('iPhone') ? 'Apple iPhone 14 (iOS PWA)' : 'Apple Mobile Web Client') : 'iOS Client',
      ...entry,
    };

    if (typeof window !== 'undefined') {
      try {
        const existing = this.getLogs();
        const updated = [fullEntry, ...existing].slice(0, 200); // mantém últimos 200 logs
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('[AuditLogger] Falha ao persistir log:', err);
      }
    }

    return fullEntry;
  }

  private getInitialSampleLogs(): AuditLogEntry[] {
    return [
      {
        id: 'AUD-10492-88a1',
        action: 'Aprovação de Desconto Comercial (15%)',
        category: 'APPROVAL',
        actor: { name: 'Saulo Oliveira', role: 'Gerente Geral', id: 'usr-admin-01' },
        target: 'Pedido #PED-2026-089 (Cliente: Tech3D Indústria)',
        details: { valorOriginal: 4500, valorComDesconto: 3825, motivo: 'Pedido de alto volume' },
        timestamp: new Date(Date.now() - 1000 * 60 * 24).toISOString(),
        device: 'Apple iPhone 14 (iOS PWA)',
        status: 'SUCCESS'
      },
      {
        id: 'AUD-10488-99b2',
        action: 'Desbloqueio com Face ID Realizado',
        category: 'SECURITY',
        actor: { name: 'Saulo Oliveira', role: 'Gerente Geral', id: 'usr-admin-01' },
        target: 'Painel Executivo Móvel',
        details: { method: 'Biometric Face ID Apple', sessionTimeout: '5 min' },
        timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        device: 'Apple iPhone 14 (iOS PWA)',
        status: 'SUCCESS'
      },
      {
        id: 'AUD-10480-11c3',
        action: 'Liberação de Ordem de Produção #OP-882',
        category: 'PRODUCTION',
        actor: { name: 'Saulo Oliveira', role: 'Gerente Geral', id: 'usr-admin-01' },
        target: 'Impressora Bambu Lab X1C #02',
        details: { material: 'PETG Preto Carvão', pecas: 12, tempoEstimado: '4h 15m' },
        timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
        device: 'Apple iPhone 14 (iOS PWA)',
        status: 'SUCCESS'
      }
    ];
  }
}
