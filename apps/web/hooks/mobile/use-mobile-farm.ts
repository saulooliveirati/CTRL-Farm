// ==============================================================================
// Hook de Frota e Telemetria de Produção — CTRL Farm Manager Mobile
// Monitoramento em tempo real das impressoras 3D com controle rápido
// ==============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuditLoggerService } from '@/services/mobile/audit-logger.service';

export type PrinterStatus = 'Offline' | 'Aquecendo' | 'Imprimindo' | 'Erro' | 'Finalizada';

export interface MobilePrinter {
  id: string;
  name: string;
  model: string;
  status: PrinterStatus;
  jobName?: string;
  progress: number; // 0 - 100
  timeRemainingMinutes?: number;
  totalTimeMinutes?: number;
  nozzleTemp: number;
  nozzleTarget: number;
  bedTemp: number;
  bedTarget: number;
  chamberTemp?: number;
  filament: {
    material: string;
    color: string;
    colorHex: string;
    usedGrams: number;
    remainingGrams: number;
    spoolBrand: string;
  };
  cameraUrl?: string;
  errorMessage?: string;
  speedMultiplier: number;
}

export function useMobileFarm() {
  const [printers, setPrinters] = useState<MobilePrinter[]>([
    {
      id: 'prt-01',
      name: 'Bambu Lab X1-Carbon #01',
      model: 'Bambu Lab X1-Carbon (AMS)',
      status: 'Imprimindo',
      jobName: 'Engrenagem_Planetaria_Industrial_v3.gcode',
      progress: 74,
      timeRemainingMinutes: 42,
      totalTimeMinutes: 160,
      nozzleTemp: 220,
      nozzleTarget: 220,
      bedTemp: 60,
      bedTarget: 60,
      chamberTemp: 38,
      filament: {
        material: 'PLA+ Tough',
        color: 'Verde Esmeralda',
        colorHex: '#20c997',
        usedGrams: 85,
        remainingGrams: 420,
        spoolBrand: 'Esun Industrial'
      },
      cameraUrl: 'https://images.unsplash.com/photo-1631556097152-c39479cbfe5e?w=600&auto=format&fit=crop&q=80',
      speedMultiplier: 1.0
    },
    {
      id: 'prt-02',
      name: 'Bambu Lab P1S #02',
      model: 'Bambu Lab P1S',
      status: 'Aquecendo',
      jobName: 'Gabinete_Sensor_IoT_Lote10.gcode',
      progress: 3,
      timeRemainingMinutes: 280,
      totalTimeMinutes: 290,
      nozzleTemp: 185,
      nozzleTarget: 245,
      bedTemp: 52,
      bedTarget: 80,
      chamberTemp: 32,
      filament: {
        material: 'PETG CF Carbono',
        color: 'Cinza Espacial',
        colorHex: '#475569',
        usedGrams: 12,
        remainingGrams: 850,
        spoolBrand: 'Polymaker'
      },
      cameraUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80',
      speedMultiplier: 1.0
    },
    {
      id: 'prt-03',
      name: 'Creality K1 Max #03',
      model: 'Creality K1 Max',
      status: 'Erro',
      jobName: 'Suporte_Bancada_Farm.gcode',
      progress: 38,
      timeRemainingMinutes: 110,
      totalTimeMinutes: 180,
      nozzleTemp: 198,
      nozzleTarget: 230,
      bedTemp: 60,
      bedTarget: 60,
      filament: {
        material: 'PLA Silk',
        color: 'Dourado Ouro',
        colorHex: '#eab308',
        usedGrams: 45,
        remainingGrams: 90,
        spoolBrand: 'Creality Hyper'
      },
      errorMessage: 'Alerta de Subextrusão: sensor de filamento detectou travamento na bobina.',
      speedMultiplier: 1.0
    },
    {
      id: 'prt-04',
      name: 'Prusa MK4 #04',
      model: 'Prusa MK4 Nextruder',
      status: 'Finalizada',
      jobName: 'Mascote_Consignado_LojaCentral.gcode',
      progress: 100,
      timeRemainingMinutes: 0,
      totalTimeMinutes: 95,
      nozzleTemp: 42,
      nozzleTarget: 0,
      bedTemp: 30,
      bedTarget: 0,
      filament: {
        material: 'PLA Pro',
        color: 'Azul Cobalto',
        colorHex: '#3b82f6',
        usedGrams: 62,
        remainingGrams: 310,
        spoolBrand: 'Prusament'
      },
      speedMultiplier: 1.0
    },
    {
      id: 'prt-05',
      name: 'Voron 2.4 Custom #05',
      model: 'Voron 2.4r2 (350mm³)',
      status: 'Imprimindo',
      jobName: 'Pecas_Mecanicas_NylonPA12.gcode',
      progress: 52,
      timeRemainingMinutes: 195,
      totalTimeMinutes: 410,
      nozzleTemp: 275,
      nozzleTarget: 275,
      bedTemp: 105,
      bedTarget: 105,
      chamberTemp: 55,
      filament: {
        material: 'Nylon PA12-CF',
        color: 'Preto Grafite',
        colorHex: '#1e293b',
        usedGrams: 140,
        remainingGrams: 680,
        spoolBrand: 'Fillamentum'
      },
      cameraUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80',
      speedMultiplier: 1.2
    },
    {
      id: 'prt-06',
      name: 'Resina Elegoo Saturn 3 #06',
      model: 'Elegoo Saturn 3 Ultra 12K',
      status: 'Offline',
      progress: 0,
      nozzleTemp: 0,
      nozzleTarget: 0,
      bedTemp: 0,
      bedTarget: 0,
      filament: {
        material: 'Resina 8K Standard',
        color: 'Cinza Mudo',
        colorHex: '#64748b',
        usedGrams: 0,
        remainingGrams: 1200,
        spoolBrand: 'Elegoo Resins'
      },
      speedMultiplier: 1.0
    }
  ]);

  // Simulação de telemetria viva (pequena variação de temperatura e avanço de progresso)
  useEffect(() => {
    const interval = setInterval(() => {
      setPrinters((prev) =>
        prev.map((prt) => {
          if (prt.status === 'Imprimindo') {
            const jitter = (Math.random() - 0.5) * 0.8;
            return {
              ...prt,
              nozzleTemp: +(prt.nozzleTarget + jitter).toFixed(1),
              bedTemp: +(prt.bedTarget + jitter * 0.4).toFixed(1),
            };
          }
          if (prt.status === 'Aquecendo') {
            const nozzleNext = Math.min(prt.nozzleTarget, prt.nozzleTemp + 4.5);
            const bedNext = Math.min(prt.bedTarget, prt.bedTemp + 1.8);
            const isReady = nozzleNext >= prt.nozzleTarget && bedNext >= prt.bedTarget;
            return {
              ...prt,
              nozzleTemp: +nozzleNext.toFixed(1),
              bedTemp: +bedNext.toFixed(1),
              status: isReady ? 'Imprimindo' : 'Aquecendo',
            };
          }
          return prt;
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Ações rápidas de controle da impressora
  const pausePrinter = useCallback((printerId: string) => {
    setPrinters((prev) =>
      prev.map((p) => (p.id === printerId ? { ...p, status: 'Aquecendo' } : p))
    );
    AuditLoggerService.getInstance().log({
      action: 'Impressão Pausada',
      category: 'PRODUCTION',
      actor: { name: 'Saulo Oliveira', role: 'Gerente Geral', id: 'usr-admin-01' },
      target: `Impressora ${printerId}`,
      details: { command: 'PAUSE' },
      status: 'WARNING',
    });
  }, []);

  const resumePrinter = useCallback((printerId: string) => {
    setPrinters((prev) =>
      prev.map((p) => (p.id === printerId ? { ...p, status: 'Imprimindo' } : p))
    );
    AuditLoggerService.getInstance().log({
      action: 'Impressão Retomada',
      category: 'PRODUCTION',
      actor: { name: 'Saulo Oliveira', role: 'Gerente Geral', id: 'usr-admin-01' },
      target: `Impressora ${printerId}`,
      details: { command: 'RESUME' },
      status: 'SUCCESS',
    });
  }, []);

  const abortPrinter = useCallback((printerId: string, reason?: string) => {
    setPrinters((prev) =>
      prev.map((p) =>
        p.id === printerId ? { ...p, status: 'Finalizada', progress: 0, timeRemainingMinutes: 0 } : p
      )
    );
    AuditLoggerService.getInstance().log({
      action: 'Impressão Abortada / Cancelada Remotamente',
      category: 'PRODUCTION',
      actor: { name: 'Saulo Oliveira', role: 'Gerente Geral', id: 'usr-admin-01' },
      target: `Impressora ${printerId}`,
      details: { command: 'ABORT', reason: reason || 'Cancelamento preventivo mobile' },
      status: 'WARNING',
    });
  }, []);

  return {
    printers,
    pausePrinter,
    resumePrinter,
    abortPrinter,
  };
}
