import * as child_process from "node:child_process";
import * as dgram from "node:dgram";
import * as net from "node:net";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { PrinterStatus } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { FirebaseFirestoreService } from "../firebase/firebase-firestore.service.js";
import { FirebaseMessagingService } from "../firebase/firebase-messaging.service.js";
import { BambuLabsApiClient } from "./bambulabs-api.client.js";
import {
  ConfigureTelemetryDto,
  HardwareProtocol,
  TestTelemetryDto,
} from "./dto/configure-telemetry.dto.js";
import { ControlAction, ControlPrinterDto } from "./dto/control-printer.dto.js";

export type TelemetryResult = {
  connected: boolean;
  message?: string;
  bedTemp?: number;
  targetBedTemp?: number;
  nozzleTemp?: number;
  targetNozzleTemp?: number;
  progressPercent?: number;
  currentLayer?: number;
  totalLayers?: number;
  status?: PrinterStatus;
  latencyMs?: number;
  firmware?: string;
  serialNumber?: string;
  modelDetected?: string;
  advice?: string;
  printer?: any;
};

const defaultPortMap: Record<HardwareProtocol, number> = {
  [HardwareProtocol.MOONRAKER]: 7125,
  [HardwareProtocol.OCTOPRINT]: 5000,
  [HardwareProtocol.FLASHFORGE]: 8899,
  [HardwareProtocol.BAMBU]: 8883,
  [HardwareProtocol.BAMBU_MQTT]: 8883,
};

@Injectable()
export class TelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryService.name);
  private pingIntervalId: NodeJS.Timeout | null = null;
  private readonly previousStatusMap = new Map<string, PrinterStatus>();
  private isPolling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly firestore: FirebaseFirestoreService,
    private readonly messaging: FirebaseMessagingService,
  ) {}

  onModuleInit() {
    this.startBackgroundMonitor();
  }

  onModuleDestroy() {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private startBackgroundMonitor() {
    // Primeira varredura 4 segundos após o início da aplicação
    setTimeout(() => {
      void this.pollAllPrinters();
    }, 4000);

    // Monitoramento contínuo a cada 20 segundos
    this.pingIntervalId = setInterval(() => {
      void this.pollAllPrinters();
    }, 20000);
  }

  async configure(companyId: string, printerId: string, dto: ConfigureTelemetryDto) {
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, companyId },
    });
    if (!printer) throw new NotFoundException("Impressora não encontrada nesta empresa.");

    const defaultPort = defaultPortMap[dto.protocol] ?? 7125;
    const port = dto.port ?? defaultPort;

    await this.prisma.printer.update({
      where: { id: printerId },
      data: {
        ipAddress: dto.ipAddress.trim(),
        protocol: dto.protocol,
        port,
        accessCode: dto.accessCode?.trim() || null,
        ...(dto.serialNumber !== undefined && {
          serialNumber: dto.serialNumber.trim() || null,
        }),
      },
    });

    return this.sync(companyId, printerId);
  }

  async testConnection(
    companyId: string,
    printerId: string,
    dto?: TestTelemetryDto,
  ): Promise<TelemetryResult> {
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, companyId },
    });
    if (!printer) throw new NotFoundException("Impressora não encontrada.");

    const protocol =
      dto?.protocol ?? (printer.protocol as HardwareProtocol) ?? HardwareProtocol.MOONRAKER;
    const ip = dto?.ipAddress?.trim() ?? printer.ipAddress;
    const port = dto?.port ?? printer.port ?? defaultPortMap[protocol] ?? 7125;
    const accessCode = dto?.accessCode?.trim() ?? printer.accessCode ?? undefined;

    if (!ip) {
      return { connected: false, message: "Informe um endereço IP para validar." };
    }

    try {
      if (protocol === HardwareProtocol.FLASHFORGE) {
        return await this.syncFlashforge(printer.id, ip, port);
      }
      if (protocol === HardwareProtocol.BAMBU || protocol === HardwareProtocol.BAMBU_MQTT) {
        return await this.syncBambu(
          printer.id,
          ip,
          port,
          accessCode,
          dto?.serialNumber?.trim() || printer.serialNumber?.trim() || undefined,
        );
      }
      if (protocol === HardwareProtocol.MOONRAKER) {
        return await this.syncMoonraker(printer.id, ip, port);
      }
      if (protocol === HardwareProtocol.OCTOPRINT) {
        return await this.syncOctoPrint(printer.id, ip, port, accessCode);
      }
    } catch (cause) {
      const err = cause instanceof Error ? cause.message : String(cause);
      let advice: string | undefined;

      // Smart diagnostic recommendations based on detected brands and common errors
      const m = (printer.manufacturer ?? "").toLowerCase();
      if (m.includes("flashforge") && port !== 8899) {
        advice =
          "Dica: As impressoras Flashforge (AD5X / Adventurer 5M) utilizam nativamente a porta 8899 (Protocolo Flashforge). Altere o protocolo e a porta para 8899.";
      } else if (m.includes("bambu") && port !== 8883) {
        advice =
          "Dica: Impressoras Bambu Lab utilizam a porta 8883 (Modo LAN) com criptografia TLS. Altere para o protocolo Bambu Lab (porta 8883).";
      } else if (m.includes("anycubic")) {
        advice =
          "Dica: Para telemetria Klipper completa na Anycubic Kobra 3, instale o addon Rinkhals (Moonraker porta 7125) ou verifique o Modo LAN no Anycubic Slicer Next.";
      }

      return {
        connected: false,
        message: `Falha ao conectar em ${ip}:${port} (${err}).`,
        advice,
      };
    }

    return { connected: false, message: "Protocolo não reconhecido." };
  }

  async sync(companyId: string, printerId: string): Promise<TelemetryResult> {
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, companyId },
    });
    if (!printer) throw new NotFoundException("Impressora não encontrada nesta empresa.");

    if (!printer.ipAddress || !printer.protocol) {
      return {
        connected: false,
        message: "Impressora sem telemetria configurada (IP ou protocolo ausente).",
      };
    }

    const protocol = printer.protocol as HardwareProtocol;
    const port = printer.port ?? defaultPortMap[protocol] ?? 7125;
    const ip = printer.ipAddress;

    let result: TelemetryResult;
    try {
      if (protocol === HardwareProtocol.FLASHFORGE) {
        result = await this.syncFlashforge(printer.id, ip, port);
      } else if (protocol === HardwareProtocol.BAMBU || protocol === HardwareProtocol.BAMBU_MQTT) {
        result = await this.syncBambu(printer.id, ip, port, printer.accessCode ?? undefined);
      } else if (protocol === HardwareProtocol.MOONRAKER) {
        result = await this.syncMoonraker(printer.id, ip, port);
      } else if (protocol === HardwareProtocol.OCTOPRINT) {
        result = await this.syncOctoPrint(printer.id, ip, port, printer.accessCode ?? undefined);
      } else {
        result = {
          connected: false,
          message: `Protocolo ${printer.protocol} não reconhecido.`,
        };
      }
    } catch (cause) {
      const errorMessage =
        cause instanceof Error ? cause.message : "Falha na conexão com a máquina";
      result = {
        connected: false,
        message: `Não foi possível conectar a ${ip}:${port} (${errorMessage}).`,
      };
    }

    // Sincronização reativa em tempo real com o Firebase Firestore
    if (result.connected) {
      void this.firestore.syncPrinterTelemetry(printer.id, companyId, {
        printerName: printer.name,
        bedTemp: result.bedTemp,
        targetBedTemp: result.targetBedTemp,
        nozzleTemp: result.nozzleTemp,
        targetNozzleTemp: result.targetNozzleTemp,
        progressPercent: result.progressPercent,
        currentLayer: result.currentLayer,
        totalLayers: result.totalLayers,
        status: result.status,
        lastSyncAt: new Date(),
      });
    }

    return result;
  }

  async disconnect(companyId: string, printerId: string) {
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, companyId },
    });
    if (!printer) throw new NotFoundException("Impressora não encontrada.");

    await this.prisma.printer.update({
      where: { id: printerId },
      data: {
        protocol: null,
        accessCode: null,
        bedTemp: null,
        targetBedTemp: null,
        nozzleTemp: null,
        targetNozzleTemp: null,
        progressPercent: null,
        currentLayer: null,
        totalLayers: null,
        lastTelemetryAt: null,
      },
    });

    return { success: true };
  }

  /**
   * Testa conectividade TCP rápida em uma porta de rede.
   * Se a conexão for estabelecida ou responder ECONNREFUSED (RST), o host está comprovadamente ligado.
   */
  private async probeTcpPort(ip: string, port: number, timeoutMs = 1200): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      let settled = false;

      const finish = (reachable: boolean) => {
        if (settled) return;
        settled = true;
        try {
          socket.destroy();
        } catch {}
        resolve(reachable);
      };

      socket.setTimeout(timeoutMs);

      socket.connect(port, ip, () => {
        finish(true);
      });

      socket.on("error", (err: any) => {
        if (err && err.code === "ECONNREFUSED") {
          finish(true);
        } else {
          finish(false);
        }
      });

      socket.on("timeout", () => finish(false));
    });
  }

  /**
   * Fallback de ping ICMP nativo do sistema operacional (Windows e Linux).
   */
  private async probeIcmpPing(ip: string, timeoutMs = 1200): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const isWin = process.platform === "win32";
      const cmd = "ping";
      const args = isWin
        ? ["-n", "1", "-w", String(timeoutMs), ip]
        : ["-c", "1", "-W", String(Math.ceil(timeoutMs / 1000)), ip];

      try {
        const child = child_process.spawn(cmd, args, { stdio: "ignore" });
        let resolved = false;

        child.on("close", (code) => {
          if (!resolved) {
            resolved = true;
            resolve(code === 0);
          }
        });

        child.on("error", () => {
          if (!resolved) {
            resolved = true;
            resolve(false);
          }
        });

        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try {
              child.kill();
            } catch {}
            resolve(false);
          }
        }, timeoutMs + 300);
      } catch {
        resolve(false);
      }
    });
  }

  /**
   * Verifica se o host informado responde a conexões de rede ou ping.
   */
  async isHostReachable(ip: string, port?: number): Promise<boolean> {
    const trimmedIp = ip.trim();
    if (!trimmedIp) return false;

    if (port && port > 0 && port <= 65535) {
      const ok = await this.probeTcpPort(trimmedIp, port, 1200);
      if (ok) return true;
    }

    const commonPorts = [80, 7125, 8883, 8899, 5000].filter((p) => p !== port);
    for (const p of commonPorts) {
      const ok = await this.probeTcpPort(trimmedIp, p, 350);
      if (ok) return true;
    }

    return await this.probeIcmpPing(trimmedIp, 1200);
  }

  /**
   * Testa e valida se uma impressora específica responde a ping e sincroniza seu status.
   */
  async pingPrinter(companyId: string, printerId: string) {
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, companyId },
    });
    if (!printer) throw new NotFoundException("Impressora não encontrada.");
    if (!printer.ipAddress) {
      return {
        reachable: false,
        status: printer.status,
        message: "Impressora sem endereço IP cadastrado.",
      };
    }

    const reachable = await this.isHostReachable(printer.ipAddress, printer.port ?? undefined);

    // Se estiver em Manutenção, o status é inviolável e nunca é sobrescrito
    if (printer.status === PrinterStatus.MAINTENANCE) {
      if (reachable && printer.protocol) {
        try {
          await this.sync(companyId, printerId);
        } catch {}
      }
      const current = await this.prisma.printer.findUnique({ where: { id: printerId } });
      return {
        reachable,
        status: PrinterStatus.MAINTENANCE,
        printer: current,
        message:
          "Equipamento sob Manutenção. O status permanece bloqueado até ser retornado manualmente para Disponível.",
      };
    }

    if (!reachable) {
      if (printer.status !== PrinterStatus.OFFLINE) {
        this.previousStatusMap.set(printer.id, printer.status);
        await this.prisma.printer.update({
          where: { id: printerId },
          data: {
            status: PrinterStatus.OFFLINE,
            nozzleTemp: null,
            targetNozzleTemp: null,
            bedTemp: null,
            targetBedTemp: null,
            progressPercent: null,
            lastTelemetryAt: new Date(),
          },
        });
      }
      const updated = await this.prisma.printer.findUnique({ where: { id: printerId } });
      return {
        reachable: false,
        status: PrinterStatus.OFFLINE,
        printer: updated,
        message: "O equipamento não respondeu ao ping/rede e está Desligado.",
      };
    }

    // Se respondeu ao ping e tem telemetria configurada: sincroniza status real
    if (printer.protocol) {
      const syncResult = await this.sync(companyId, printerId);
      const updated = await this.prisma.printer.findUnique({ where: { id: printerId } });
      return {
        reachable: true,
        status: updated?.status ?? PrinterStatus.READY,
        telemetry: syncResult,
        printer: updated,
        message: "Equipamento online e sincronizado via telemetria com sucesso.",
      };
    }

    // Se respondeu ao ping mas não possui telemetria ativa: restaura status anterior ou READY
    let newStatus: PrinterStatus = printer.status;
    if (printer.status === PrinterStatus.OFFLINE) {
      newStatus =
        this.previousStatusMap.get(printer.id) ||
        ((printer as any).previousStatus as PrinterStatus) ||
        PrinterStatus.READY;
      await this.prisma.printer.update({
        where: { id: printerId },
        data: { status: newStatus, lastTelemetryAt: new Date() },
      });
    }

    const updated = await this.prisma.printer.findUnique({ where: { id: printerId } });
    return {
      reachable: true,
      status: newStatus,
      printer: updated,
      message: "Equipamento online respondendo ao ping na rede local.",
    };
  }

  /**
   * Monitoramento contínuo em segundo plano de todas as impressoras com IP cadastrado.
   */
  async pollAllPrinters(): Promise<{ total: number; online: number; offline: number }> {
    if (this.isPolling) return { total: 0, online: 0, offline: 0 };
    this.isPolling = true;

    let online = 0;
    let offline = 0;
    let total = 0;

    try {
      const printers = await this.prisma.printer.findMany({
        where: { ipAddress: { not: null } },
      });
      total = printers.length;

      for (const printer of printers) {
        if (!printer.ipAddress?.trim()) continue;
        const ip = printer.ipAddress.trim();

        try {
          const isReachable = await this.isHostReachable(ip, printer.port ?? undefined);

          if (isReachable) online++;
          else offline++;

          // REGRA DE OURO: SE ESTIVER EM MANUTENÇÃO, NUNCA ALTERA STATUS AUTOMATICAMENTE!
          if (printer.status === PrinterStatus.MAINTENANCE) {
            if (isReachable && printer.protocol) {
              try {
                await this.sync(printer.companyId, printer.id);
              } catch {}
            }
            continue;
          }

          if (!isReachable) {
            if (printer.status !== PrinterStatus.OFFLINE) {
              this.previousStatusMap.set(printer.id, printer.status);
              this.logger.log(
                `[Ping Monitor] "${printer.name}" (${ip}) não respondeu. Status alterado de ${printer.status} para OFFLINE (Desligado).`,
              );
              await this.prisma.printer.update({
                where: { id: printer.id },
                data: {
                  status: PrinterStatus.OFFLINE,
                  nozzleTemp: null,
                  targetNozzleTemp: null,
                  bedTemp: null,
                  targetBedTemp: null,
                  progressPercent: null,
                  lastTelemetryAt: new Date(),
                },
              });
            }
          } else {
            // Equipamento online
            if (printer.protocol) {
              try {
                await this.sync(printer.companyId, printer.id);
              } catch {
                if (printer.status === PrinterStatus.OFFLINE) {
                  const restored: PrinterStatus =
                    this.previousStatusMap.get(printer.id) ||
                    ((printer as any).previousStatus as PrinterStatus) ||
                    PrinterStatus.READY;
                  await this.prisma.printer.update({
                    where: { id: printer.id },
                    data: { status: restored, lastTelemetryAt: new Date() },
                  });
                }
              }
            } else {
              if (printer.status === PrinterStatus.OFFLINE) {
                const restored: PrinterStatus =
                  this.previousStatusMap.get(printer.id) ||
                  ((printer as any).previousStatus as PrinterStatus) ||
                  PrinterStatus.READY;
                this.logger.log(
                  `[Ping Monitor] "${printer.name}" (${ip}) respondeu ao ping. Status restaurado para ${restored}.`,
                );
                await this.prisma.printer.update({
                  where: { id: printer.id },
                  data: { status: restored, lastTelemetryAt: new Date() },
                });
              }
            }
          }
        } catch (itemErr) {
          this.logger.debug?.(`Erro ao monitorar impressora ${printer.name}: ${itemErr}`);
        }
      }
    } catch (err) {
      this.logger.error(`Erro no loop do monitor de telemetria/ping: ${err}`);
    } finally {
      this.isPolling = false;
    }

    return { total, online, offline };
  }

  private async syncMoonraker(
    printerId: string,
    ip: string,
    port: number,
  ): Promise<TelemetryResult> {
    const url = `http://${ip}:${port}/printer/objects/query?heater_bed&extruder&print_stats`;
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      throw new Error(`Moonraker retornou HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      result?: {
        status?: {
          extruder?: { temperature?: number; target?: number };
          heater_bed?: { temperature?: number; target?: number };
          print_stats?: { state?: string; progress?: number };
        };
      };
    };

    const statusObj = json.result?.status;
    const nozzleTemp = statusObj?.extruder?.temperature
      ? Math.round(statusObj.extruder.temperature * 10) / 10
      : undefined;
    const targetNozzleTemp = statusObj?.extruder?.target
      ? Math.round(statusObj.extruder.target * 10) / 10
      : undefined;
    const bedTemp = statusObj?.heater_bed?.temperature
      ? Math.round(statusObj.heater_bed.temperature * 10) / 10
      : undefined;
    const targetBedTemp = statusObj?.heater_bed?.target
      ? Math.round(statusObj.heater_bed.target * 10) / 10
      : undefined;

    const rawState = statusObj?.print_stats?.state?.toLowerCase() ?? "";
    let status: PrinterStatus | undefined;
    if (rawState === "printing") status = PrinterStatus.PRINTING;
    else if (rawState === "paused") status = PrinterStatus.PAUSED;
    else if (rawState === "complete" || rawState === "standby") status = PrinterStatus.READY;
    else if (rawState === "error" || rawState === "shutdown") status = PrinterStatus.ERROR;

    const progressPercent = statusObj?.print_stats?.progress
      ? Math.round(statusObj.print_stats.progress * 1000) / 10
      : undefined;

    const currentPrinter = await this.prisma.printer.findUnique({ where: { id: printerId } });
    const isMaintenance = currentPrinter?.status === PrinterStatus.MAINTENANCE;

    await this.prisma.printer.update({
      where: { id: printerId },
      data: {
        ...(nozzleTemp !== undefined && { nozzleTemp }),
        ...(targetNozzleTemp !== undefined && { targetNozzleTemp }),
        ...(bedTemp !== undefined && { bedTemp }),
        ...(targetBedTemp !== undefined && { targetBedTemp }),
        ...(progressPercent !== undefined && { progressPercent }),
        ...(!isMaintenance && status !== undefined && { status }),
        lastTelemetryAt: new Date(),
      },
    });

    return {
      connected: true,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      progressPercent,
      status: isMaintenance ? PrinterStatus.MAINTENANCE : status,
    };
  }

  private async syncOctoPrint(
    printerId: string,
    ip: string,
    port: number,
    apiKey?: string,
  ): Promise<TelemetryResult> {
    const url = `http://${ip}:${port}/api/printer`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        ...(apiKey && { "X-Api-Key": apiKey }),
      },
      signal: AbortSignal.timeout(3500),
    });

    if (!response.ok) {
      throw new Error(`OctoPrint retornou HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      temperature?: {
        tool0?: { actual?: number; target?: number };
        bed?: { actual?: number; target?: number };
      };
      state?: {
        flags?: {
          printing?: boolean;
          paused?: boolean;
          ready?: boolean;
          error?: boolean;
        };
      };
    };

    const nozzleTemp = json.temperature?.tool0?.actual
      ? Math.round(json.temperature.tool0.actual * 10) / 10
      : undefined;
    const targetNozzleTemp = json.temperature?.tool0?.target
      ? Math.round(json.temperature.tool0.target * 10) / 10
      : undefined;
    const bedTemp = json.temperature?.bed?.actual
      ? Math.round(json.temperature.bed.actual * 10) / 10
      : undefined;
    const targetBedTemp = json.temperature?.bed?.target
      ? Math.round(json.temperature.bed.target * 10) / 10
      : undefined;

    let status: PrinterStatus | undefined;
    if (json.state?.flags?.printing) status = PrinterStatus.PRINTING;
    else if (json.state?.flags?.paused) status = PrinterStatus.PAUSED;
    else if (json.state?.flags?.ready) status = PrinterStatus.READY;
    else if (json.state?.flags?.error) status = PrinterStatus.ERROR;

    const currentPrinter = await this.prisma.printer.findUnique({ where: { id: printerId } });
    const isMaintenance = currentPrinter?.status === PrinterStatus.MAINTENANCE;

    await this.prisma.printer.update({
      where: { id: printerId },
      data: {
        ...(nozzleTemp !== undefined && { nozzleTemp }),
        ...(targetNozzleTemp !== undefined && { targetNozzleTemp }),
        ...(bedTemp !== undefined && { bedTemp }),
        ...(targetBedTemp !== undefined && { targetBedTemp }),
        ...(!isMaintenance && status !== undefined && { status }),
        lastTelemetryAt: new Date(),
      },
    });

    return {
      connected: true,
      nozzleTemp,
      targetNozzleTemp,
      bedTemp,
      targetBedTemp,
      status: isMaintenance ? PrinterStatus.MAINTENANCE : status,
    };
  }

  private async syncFlashforge(
    printerId: string,
    ip: string,
    port: number,
  ): Promise<TelemetryResult> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let buffer = "";
      const commands = ["~M115\r\n", "~M105\r\n", "~M119\r\n", "~M27\r\n"];
      let cmdIndex = 0;
      let finished = false;

      const finish = async (connected: boolean, errorMsg?: string) => {
        if (finished) return;
        finished = true;
        socket.destroy();

        if (!connected) {
          reject(new Error(errorMsg ?? "Falha ao comunicar com a Flashforge"));
          return;
        }

        const snMatch = buffer.match(/SN:\s*([^\r\n]+)/);
        const fwMatch = buffer.match(/Firmware:\s*([^\r\n]+)/);
        const typeMatch = buffer.match(/Machine Type:\s*([^\r\n]+)/);
        const serialNumber = snMatch?.[1]?.trim();
        const firmware = fwMatch?.[1]?.trim();
        const modelDetected = typeMatch?.[1]?.trim();

        const t0Match = buffer.match(/T0:([0-9.]+)\s*\/([0-9.]+)/);
        const bMatch = buffer.match(/B:([0-9.]+)\s*\/([0-9.]+)/);
        const nozzleTemp = t0Match ? Number(t0Match[1]) : undefined;
        const targetNozzleTemp = t0Match ? Number(t0Match[2]) : undefined;
        const bedTemp = bMatch ? Number(bMatch[1]) : undefined;
        const targetBedTemp = bMatch ? Number(bMatch[2]) : undefined;

        const statusMatch = buffer.match(/MachineStatus:\s*([A-Za-z]+)/);
        let status: PrinterStatus | undefined;
        const rawStatus = statusMatch?.[1]?.toUpperCase();
        if (rawStatus === "BUILDING" || rawStatus === "PRINTING") status = PrinterStatus.PRINTING;
        else if (rawStatus === "PAUSED") status = PrinterStatus.PAUSED;
        else if (rawStatus === "READY") status = PrinterStatus.READY;
        else if (rawStatus) status = PrinterStatus.READY;

        const byteMatch = buffer.match(/SD printing byte\s*([0-9]+)\/([0-9]+)/);
        let progressPercent: number | undefined;
        if (byteMatch && Number(byteMatch[2]) > 0) {
          progressPercent = Math.round((Number(byteMatch[1]) / Number(byteMatch[2])) * 1000) / 10;
        }
        const layerMatch = buffer.match(/Layer:\s*([0-9]+)\/([0-9]+)/);
        const currentLayer = layerMatch ? Number(layerMatch[1]) : undefined;
        const totalLayers = layerMatch ? Number(layerMatch[2]) : undefined;

        const currentPrinter = await this.prisma.printer.findUnique({ where: { id: printerId } });
        const isMaintenance = currentPrinter?.status === PrinterStatus.MAINTENANCE;

        await this.prisma.printer.update({
          where: { id: printerId },
          data: {
            ...(nozzleTemp !== undefined && { nozzleTemp }),
            ...(targetNozzleTemp !== undefined && { targetNozzleTemp }),
            ...(bedTemp !== undefined && { bedTemp }),
            ...(targetBedTemp !== undefined && { targetBedTemp }),
            ...(!isMaintenance && { status }),
            ...(progressPercent !== undefined && { progressPercent }),
            ...(currentLayer !== undefined && { currentLayer }),
            ...(totalLayers !== undefined && { totalLayers }),
            ...(serialNumber && { serialNumber }),
            lastTelemetryAt: new Date(),
          },
        });

        const updated = await this.prisma.printer.findUnique({ where: { id: printerId } });
        resolve({
          connected: true,
          nozzleTemp,
          targetNozzleTemp,
          bedTemp,
          targetBedTemp,
          progressPercent,
          currentLayer,
          totalLayers,
          status: isMaintenance ? PrinterStatus.MAINTENANCE : status,
          latencyMs: Date.now() - start,
          firmware,
          serialNumber,
          modelDetected,
          printer: updated,
        });
      };

      socket.setTimeout(2800);

      socket.connect(port, ip, () => {
        socket.write(commands[cmdIndex++]);
      });

      socket.on("data", (chunk) => {
        const text = chunk.toString();
        buffer += text;
        if (text.includes("ok")) {
          if (cmdIndex < commands.length) {
            socket.write(commands[cmdIndex++]);
          } else {
            finish(true);
          }
        }
      });

      socket.on("timeout", () => {
        if (buffer.length > 0 && buffer.includes("T0:")) {
          finish(true);
        } else {
          finish(false, `Timeout na porta ${port} da Flashforge`);
        }
      });

      socket.on("error", (err) => {
        finish(false, err.message);
      });
    });
  }

  private async discoverBambuSerial(ip: string): Promise<string | null> {
    return new Promise((resolve) => {
      let resolved = false;
      let socket: dgram.Socket;
      try {
        socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
      } catch {
        return resolve(null);
      }

      const finish = (sn: string | null) => {
        if (resolved) return;
        resolved = true;
        try {
          socket.close();
        } catch {}
        resolve(sn);
      };

      socket.on("message", (msg, rinfo) => {
        const text = msg.toString();
        if (
          rinfo.address === ip ||
          text.includes("bambulab") ||
          text.includes("USN:") ||
          text.includes("DevId") ||
          text.includes("DevModel")
        ) {
          const usnMatch =
            text.match(
              /(?:USN|DevId\.bambu\.com|DevId|device_id|serial_number|SN)[:=]\s*([A-Za-z0-9]+)/i,
            ) ||
            text.match(/Location:\s*([A-Za-z0-9]+)/i) ||
            text.match(/\b(01[A-Za-z0-9]{13,18}|03[A-Za-z0-9]{13,18}|00[A-Za-z0-9]{13,18})\b/);
          if (usnMatch?.[1]) {
            finish(usnMatch[1].trim());
          }
        }
      });

      socket.on("error", () => finish(null));

      try {
        socket.bind(0, () => {
          try {
            socket.addMembership("239.255.255.250");
          } catch {}

          const searchMsg = Buffer.from(
            "M-SEARCH * HTTP/1.1\r\n" +
              "HOST: 239.255.255.250:1990\r\n" +
              'MAN: "ssdp:discover"\r\n' +
              "MX: 1\r\n" +
              "ST: urn:bambulab-com:device:3dprinter:1\r\n\r\n",
          );
          try {
            socket.send(searchMsg, 0, searchMsg.length, 2021, ip);
            socket.send(searchMsg, 0, searchMsg.length, 1990, ip);
            socket.send(searchMsg, 0, searchMsg.length, 1900, ip);
            socket.send(searchMsg, 0, searchMsg.length, 1990, "239.255.255.250");
          } catch {}
        });
      } catch {
        finish(null);
      }

      setTimeout(() => finish(null), 2500);
    });
  }

  private async syncBambu(
    printerId: string,
    ip: string,
    port: number,
    accessCode?: string,
    candidateSerial?: string,
  ): Promise<TelemetryResult> {
    const printer = await this.prisma.printer.findUnique({ where: { id: printerId } });
    if (!printer) throw new Error("Impressora não encontrada.");

    let serialNumber = candidateSerial || printer.serialNumber?.trim();
    if (!serialNumber) {
      serialNumber = (await this.discoverBambuSerial(ip)) ?? undefined;
    }

    if (serialNumber && serialNumber !== printer.serialNumber) {
      await this.prisma.printer.update({
        where: { id: printerId },
        data: { serialNumber },
      });
    }

    if (!accessCode) {
      return {
        connected: false,
        message: "Informe o Código de Acesso (Access Code) da impressora Bambu Lab.",
        advice:
          "O Código de Acesso pode ser visualizado na tela da impressora em Configurações > Rede, ou no app Bambu Handy (não é necessário ativar o Modo LAN).",
      };
    }

    if (!serialNumber) {
      return {
        connected: false,
        message: "Número de Série da Bambu Lab não encontrado e não detectado automaticamente.",
        advice:
          "Informe o Número de Série (ex.: 01P00A000000000) no campo de telemetria ou no cadastro da impressora. Você encontra o número de série no app Bambu Handy ou na tela da máquina em Configurações > Geral > Sobre.",
      };
    }

    // Utiliza o cliente BambuLabsApiClient baseado na biblioteca oficial BambuTools/bambulabs_api
    const client = new BambuLabsApiClient(ip, accessCode, serialNumber, port);
    const state = await client.getState(8000);

    if (!state.connected) {
      return {
        connected: false,
        message: state.message || "Falha na conexão MQTT com a Bambu Lab.",
        advice: state.advice,
      };
    }

    // Converte status
    let prismaStatus: PrinterStatus = PrinterStatus.READY;
    if (state.status === "PRINTING") prismaStatus = PrinterStatus.PRINTING;
    else if (state.status === "PAUSED") prismaStatus = PrinterStatus.PAUSED;
    else if (state.status === "ERROR") prismaStatus = PrinterStatus.ERROR;

    const isMaintenance = printer?.status === PrinterStatus.MAINTENANCE;

    await this.prisma.printer.update({
      where: { id: printerId },
      data: {
        ...(state.nozzleTemp !== undefined && { nozzleTemp: state.nozzleTemp }),
        ...(state.targetNozzleTemp !== undefined && { targetNozzleTemp: state.targetNozzleTemp }),
        ...(state.bedTemp !== undefined && { bedTemp: state.bedTemp }),
        ...(state.targetBedTemp !== undefined && { targetBedTemp: state.targetBedTemp }),
        ...(state.progressPercent !== undefined && { progressPercent: state.progressPercent }),
        ...(state.currentLayer !== undefined && { currentLayer: state.currentLayer }),
        ...(state.totalLayers !== undefined && { totalLayers: state.totalLayers }),
        ...(!isMaintenance && { status: prismaStatus }),
        serialNumber,
        lastTelemetryAt: new Date(),
      },
    });

    const updated = await this.prisma.printer.findUnique({ where: { id: printerId } });

    return {
      connected: true,
      latencyMs: state.latencyMs,
      nozzleTemp: state.nozzleTemp,
      targetNozzleTemp: state.targetNozzleTemp,
      bedTemp: state.bedTemp,
      targetBedTemp: state.targetBedTemp,
      progressPercent: state.progressPercent,
      currentLayer: state.currentLayer,
      totalLayers: state.totalLayers,
      status: isMaintenance ? PrinterStatus.MAINTENANCE : prismaStatus,
      firmware: state.firmware,
      serialNumber,
      message: state.message,
      printer: updated,
    };
  }

  private async sendBambuCommand(
    ip: string,
    port: number,
    serialNumber: string,
    accessCode: string,
    dto: ControlPrinterDto,
  ): Promise<void> {
    const client = new BambuLabsApiClient(ip, accessCode, serialNumber, port);

    switch (dto.action) {
      case ControlAction.SET_NOZZLE_TEMP:
        await client.setNozzleTemp(Math.round(dto.value ?? 0));
        break;
      case ControlAction.SET_BED_TEMP:
        await client.setBedTemp(Math.round(dto.value ?? 0));
        break;
      case ControlAction.SET_FAN_SPEED:
        await client.sendGcode(`M106 S${Math.round(((dto.value ?? 0) / 100) * 255)}`);
        break;
      case ControlAction.SET_SPEED_RATE: {
        const rate = Number(dto.value ?? 100);
        let spdLvl: 1 | 2 | 3 | 4 = 2;
        if (rate <= 60) spdLvl = 1;
        else if (rate <= 110) spdLvl = 2;
        else if (rate <= 140) spdLvl = 3;
        else spdLvl = 4;
        await client.setSpeed(spdLvl);
        break;
      }
      case ControlAction.TOGGLE_LIGHT:
        if ((dto.value ?? 1) > 0) {
          await client.turnLightOn();
        } else {
          await client.turnLightOff();
        }
        break;
      case ControlAction.HOME_AXES:
        await client.home();
        break;
      case ControlAction.MOVE_AXIS: {
        const axis = (dto.axis || "X").toUpperCase();
        const dist = dto.distance || 10;
        await client.sendGcode(`G91\nG1 ${axis}${dist} F2400\nG90`);
        break;
      }
      case ControlAction.EXTRUDE: {
        const dist = dto.distance || 10;
        await client.sendGcode(`M83\nG1 E${dist} F300`);
        break;
      }
      case ControlAction.PAUSE:
        await client.pause();
        break;
      case ControlAction.RESUME:
        await client.resume();
        break;
      case ControlAction.CANCEL:
        await client.stop();
        break;
      case ControlAction.LOAD_FILAMENT:
        await client.sendCommand({
          print: {
            sequence_id: "0",
            command: "ams_change_filament",
            target: Math.max(0, Number(dto.slot ?? 1) - 1),
          },
        });
        break;
      case ControlAction.UNLOAD_FILAMENT:
        await client.sendCommand({
          print: {
            sequence_id: "0",
            command: "ams_change_filament",
            target: 255,
          },
        });
        break;
      case ControlAction.SEND_GCODE:
        if (dto.gcode) {
          await client.sendGcode(dto.gcode);
        }
        break;
      default:
        await client.sendCommand({
          pushing: {
            sequence_id: "0",
            command: "pushall",
          },
        });
        break;
    }
  }

  async control(companyId: string, printerId: string, dto: ControlPrinterDto) {
    const printer = await this.prisma.printer.findFirst({
      where: { id: printerId, companyId },
    });
    if (!printer) throw new NotFoundException("Impressora não encontrada.");

    const protocol = printer.protocol as HardwareProtocol;
    const ip = printer.ipAddress;
    const port = printer.port ?? (protocol ? defaultPortMap[protocol] : 7125);

    if (!ip) {
      throw new BadRequestException(
        "Impressora sem endereço IP cadastrado. Configure o IP na tela de Configuração antes de enviar comandos.",
      );
    }

    // 1. Control for Flashforge
    if (protocol === HardwareProtocol.FLASHFORGE) {
      try {
        let gcodeCmd = "";
        switch (dto.action) {
          case ControlAction.SET_NOZZLE_TEMP:
            gcodeCmd = `~M104 S${Math.round(dto.value ?? 0)}\r\n`;
            break;
          case ControlAction.SET_BED_TEMP:
            gcodeCmd = `~M140 S${Math.round(dto.value ?? 0)}\r\n`;
            break;
          case ControlAction.SET_FAN_SPEED:
            gcodeCmd = `~M106 S${Math.round(((dto.value ?? 0) / 100) * 255)}\r\n`;
            break;
          case ControlAction.SET_SPEED_RATE:
            gcodeCmd = `~M220 S${Math.round(dto.value ?? 100)}\r\n`;
            break;
          case ControlAction.TOGGLE_LIGHT:
            gcodeCmd = (dto.value ?? 1) > 0 ? "~M146 r255 g255 b255\r\n" : "~M146 r0 g0 b0\r\n";
            break;
          case ControlAction.HOME_AXES:
            gcodeCmd = "~G28\r\n";
            break;
          case ControlAction.MOVE_AXIS: {
            const axis = (dto.axis || "X").toUpperCase();
            const dist = dto.distance || 10;
            gcodeCmd = `~G91\r\n~G1 ${axis}${dist} F2400\r\n~G90\r\n`;
            break;
          }
          case ControlAction.EXTRUDE: {
            const dist = dto.distance || 10;
            gcodeCmd = `~M83\r\n~G1 E${dist} F300\r\n`;
            break;
          }
          case ControlAction.PAUSE:
            gcodeCmd = "~M25\r\n";
            break;
          case ControlAction.RESUME:
            gcodeCmd = "~M24\r\n";
            break;
          case ControlAction.CANCEL:
            gcodeCmd = "~M26\r\n";
            break;
          case ControlAction.LOAD_FILAMENT:
            gcodeCmd = `~M83\r\n~G1 E50 F150\r\n`;
            break;
          case ControlAction.UNLOAD_FILAMENT:
            gcodeCmd = `~M83\r\n~G1 E-50 F300\r\n`;
            break;
          case ControlAction.SEND_GCODE:
            gcodeCmd = `~${dto.gcode}\r\n`;
            break;
          default:
            break;
        }

        if (gcodeCmd) {
          await this.sendFlashforgeRaw(ip, port, gcodeCmd);
        }
      } catch (e: any) {
        throw new BadRequestException(
          `Falha de comunicação com a Flashforge em ${ip}:${port} (${e?.message || e}). Verifique se a impressora está ligada na rede.`,
        );
      }
    }

    // 2. Control for Moonraker
    if (protocol === HardwareProtocol.MOONRAKER) {
      try {
        const baseUrl = `http://${ip}:${port}`;
        switch (dto.action) {
          case ControlAction.SET_NOZZLE_TEMP:
            await fetch(`${baseUrl}/printer/gcode/script?script=M104%20S${dto.value ?? 0}`, {
              method: "POST",
              signal: AbortSignal.timeout(2500),
            });
            break;
          case ControlAction.SET_BED_TEMP:
            await fetch(`${baseUrl}/printer/gcode/script?script=M140%20S${dto.value ?? 0}`, {
              method: "POST",
              signal: AbortSignal.timeout(2500),
            });
            break;
          case ControlAction.SET_FAN_SPEED:
            await fetch(
              `${baseUrl}/printer/gcode/script?script=M106%20S${Math.round(((dto.value ?? 0) / 100) * 255)}`,
              {
                method: "POST",
                signal: AbortSignal.timeout(2500),
              },
            );
            break;
          case ControlAction.SET_SPEED_RATE:
            await fetch(
              `${baseUrl}/printer/gcode/script?script=M220%20S${Math.round(dto.value ?? 100)}`,
              {
                method: "POST",
                signal: AbortSignal.timeout(2500),
              },
            );
            break;
          case ControlAction.HOME_AXES:
            await fetch(`${baseUrl}/printer/gcode/script?script=G28`, {
              method: "POST",
              signal: AbortSignal.timeout(2500),
            });
            break;
          case ControlAction.MOVE_AXIS: {
            const axis = (dto.axis || "X").toUpperCase();
            const dist = dto.distance || 10;
            await fetch(
              `${baseUrl}/printer/gcode/script?script=G91%0AG1%20${axis}${dist}%20F2400%0AG90`,
              {
                method: "POST",
                signal: AbortSignal.timeout(2500),
              },
            );
            break;
          }
          case ControlAction.EXTRUDE: {
            const dist = dto.distance || 10;
            await fetch(`${baseUrl}/printer/gcode/script?script=M83%0AG1%20E${dist}%20F300`, {
              method: "POST",
              signal: AbortSignal.timeout(2500),
            });
            break;
          }
          case ControlAction.PAUSE:
            await fetch(`${baseUrl}/printer/print/pause`, {
              method: "POST",
              signal: AbortSignal.timeout(2500),
            });
            break;
          case ControlAction.RESUME:
            await fetch(`${baseUrl}/printer/print/resume`, {
              method: "POST",
              signal: AbortSignal.timeout(2500),
            });
            break;
          case ControlAction.CANCEL:
            await fetch(`${baseUrl}/printer/print/cancel`, {
              method: "POST",
              signal: AbortSignal.timeout(2500),
            });
            break;
          case ControlAction.SEND_GCODE:
            await fetch(
              `${baseUrl}/printer/gcode/script?script=${encodeURIComponent(dto.gcode ?? "")}`,
              {
                method: "POST",
                signal: AbortSignal.timeout(2500),
              },
            );
            break;
          default:
            break;
        }
      } catch (e: any) {
        throw new BadRequestException(
          `Falha de comunicação com Klipper/Moonraker em ${ip}:${port} (${e?.message || e}).`,
        );
      }
    }

    // 3. Control for Bambu Lab (Envio de Comandos Reais via MQTT)
    if (protocol === HardwareProtocol.BAMBU || protocol === HardwareProtocol.BAMBU_MQTT) {
      let serialNumber = printer.serialNumber?.trim();
      if (!serialNumber) {
        serialNumber = (await this.discoverBambuSerial(ip)) ?? undefined;
        if (serialNumber) {
          await this.prisma.printer.update({
            where: { id: printerId },
            data: { serialNumber },
          });
        }
      }
      const accessCode = printer.accessCode?.trim();
      if (!accessCode) {
        throw new BadRequestException(
          "Código de Acesso da Bambu Lab não configurado. Adicione o Código de Acesso na tela de configuração da impressora.",
        );
      }
      if (!serialNumber) {
        throw new BadRequestException(
          "Número de Série da Bambu Lab não encontrado. Informe o número de série da máquina para envio de comandos.",
        );
      }

      await this.sendBambuCommand(ip, port, serialNumber, accessCode, dto);
    }

    // 4. Update database state accordingly
    const updateData: Record<string, any> = {};
    if (dto.action === ControlAction.SET_NOZZLE_TEMP) {
      updateData.targetNozzleTemp = dto.value;
    }
    if (dto.action === ControlAction.SET_BED_TEMP) {
      updateData.targetBedTemp = dto.value;
    }
    if (dto.action === ControlAction.PAUSE) {
      updateData.status = PrinterStatus.PAUSED;
    }
    if (dto.action === ControlAction.RESUME) {
      updateData.status = PrinterStatus.PRINTING;
    }
    if (dto.action === ControlAction.CANCEL) {
      updateData.status = PrinterStatus.READY;
      updateData.progressPercent = 0;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.printer.update({
        where: { id: printerId },
        data: updateData,
      });
    }

    const updatedPrinter = await this.prisma.printer.findUnique({
      where: { id: printerId },
      include: { supplier: true },
    });

    return {
      success: true,
      message: `Comando ${dto.action} aplicado com sucesso!`,
      action: dto.action,
      value: dto.value,
      printer: updatedPrinter,
    };
  }

  private sendFlashforgeRaw(ip: string, port: number, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      let res = "";
      socket.setTimeout(2500);
      socket.connect(port, ip, () => {
        socket.write(command);
      });
      socket.on("data", (d) => {
        res += d.toString();
        if (res.includes("ok")) {
          socket.destroy();
          resolve(res);
        }
      });
      socket.on("timeout", () => {
        socket.destroy();
        if (res.length > 0) resolve(res);
        else reject(new Error(`Timeout ao aguardar resposta na porta ${port}`));
      });
      socket.on("error", (err) => {
        socket.destroy();
        reject(err);
      });
    });
  }
}
