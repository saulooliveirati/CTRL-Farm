import * as mqtt from "mqtt";

export interface BambuPrinterState {
  connected: boolean;
  message?: string;
  advice?: string;
  latencyMs?: number;
  gcodeState?: string;
  status?: "READY" | "PRINTING" | "PAUSED" | "ERROR" | "MAINTENANCE" | "OFFLINE";
  nozzleTemp?: number;
  targetNozzleTemp?: number;
  bedTemp?: number;
  targetBedTemp?: number;
  chamberTemp?: number;
  progressPercent?: number;
  currentLayer?: number;
  totalLayers?: number;
  remainingTimeMin?: number;
  subtaskName?: string;
  speedLevel?: number; // 1 = Silent (50%), 2 = Standard (100%), 3 = Sport (124%), 4 = Ludicrous (166%)
  fanSpeed?: number;
  auxFanSpeed?: number;
  chamberLight?: boolean;
  serialNumber?: string;
  firmware?: string;
  wifiSignal?: string;
  ams?: {
    humidity?: number;
    activeTray?: number;
    trays?: Array<{
      id: number;
      material?: string;
      color?: string;
      remain?: number;
    }>;
  };
}

/**
 * Cliente de telemetria e controle Bambu Lab baseado na biblioteca BambuTools/bambulabs_api
 * Comunica via protocolo local MQTT TLS na porta 8883.
 */
export class BambuLabsApiClient {
  private client: mqtt.MqttClient | null = null;
  private readonly ip: string;
  private readonly accessCode: string;
  private readonly serialNumber: string;

  constructor(
    ip: string,
    accessCode: string,
    serialNumber: string,
    private readonly port: number = 8883,
  ) {
    this.ip = ip.trim();
    this.accessCode = accessCode.trim();
    this.serialNumber = serialNumber.trim().toUpperCase();
  }

  /**
   * Conecta ao broker MQTT local da Bambu Lab, envia comando 'pushall' e aguarda telemetria
   */
  async getState(timeoutMs = 8000): Promise<BambuPrinterState> {
    const start = Date.now();
    const connectMqtt = mqtt.connect || (mqtt as any).default?.connect;

    return new Promise<BambuPrinterState>((resolve) => {
      let resolved = false;
      const targetTopic = `device/${this.serialNumber}/report`;
      const requestTopic = `device/${this.serialNumber}/request`;

      // Configuração de cliente idêntica às melhores práticas do BambuTools/bambulabs_api
      const client = connectMqtt(`mqtts://${this.ip}:${this.port}`, {
        username: "bblp",
        password: this.accessCode,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined, // Evita falha de hostname no Node.js TLS para IP local
        ciphers: "DEFAULT:@SECLEVEL=0", // Suporte a cifras TLS do firmware da Bambu Lab
        clientId: `bambu_client_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        protocolVersion: 4,
        keepalive: 60,
        clean: true,
        connectTimeout: 6000,
        reconnectPeriod: 0,
      } as any);

      this.client = client;

      const finish = (result: BambuPrinterState) => {
        if (resolved) return;
        resolved = true;
        try {
          client.end(true);
        } catch {}
        resolve(result);
      };

      const fail = (errMsg: string, advice?: string) => {
        if (resolved) return;
        resolved = true;
        try {
          client.end(true);
        } catch {}
        resolve({
          connected: false,
          message: errMsg,
          advice:
            advice ??
            "Verifique se a impressora está ligada, na mesma rede local e com o 'Modo Apenas LAN' ativado.",
        });
      };

      client.on("connect", () => {
        client.subscribe(targetTopic, { qos: 0 }, (err) => {
          if (err) {
            fail(`Erro ao inscrever no tópico de telemetria Bambu: ${err.message}`);
            return;
          }

          // Envia requisição 'pushall' idêntica ao bambulabs_api para receber snapshot completo de sensores
          client.publish(
            requestTopic,
            JSON.stringify({
              pushing: {
                sequence_id: "0",
                command: "pushall",
              },
            }),
            { qos: 0 },
          );

          // Também solicita get_version
          setTimeout(() => {
            if (!resolved) {
              client.publish(
                requestTopic,
                JSON.stringify({
                  info: {
                    sequence_id: "1",
                    command: "get_version",
                  },
                }),
                { qos: 0 },
              );
            }
          }, 400);
        });
      });

      // Acumulador de dados da telemetria (Bambu Lab pode enviar pacotes incrementais)
      const accumulatedData: Record<string, any> = {};

      client.on("message", (_topic, payload) => {
        try {
          const parsed = JSON.parse(payload.toString());
          const printObj = parsed.print;
          if (printObj) {
            Object.assign(accumulatedData, printObj);
          }
          if (parsed.info) {
            Object.assign(accumulatedData, parsed.info);
          }

          // Quando tivermos informações térmicas ou de gcode_state, consolidamos a resposta
          if (
            accumulatedData.nozzle_temper !== undefined ||
            accumulatedData.bed_temper !== undefined ||
            accumulatedData.gcode_state !== undefined
          ) {
            const latencyMs = Date.now() - start;

            const nozzleTemp =
              accumulatedData.nozzle_temper !== undefined
                ? Math.round(Number(accumulatedData.nozzle_temper) * 10) / 10
                : undefined;
            const targetNozzleTemp =
              accumulatedData.nozzle_target_temper !== undefined
                ? Math.round(Number(accumulatedData.nozzle_target_temper))
                : undefined;
            const bedTemp =
              accumulatedData.bed_temper !== undefined
                ? Math.round(Number(accumulatedData.bed_temper) * 10) / 10
                : undefined;
            const targetBedTemp =
              accumulatedData.bed_target_temper !== undefined
                ? Math.round(Number(accumulatedData.bed_target_temper))
                : undefined;
            const chamberTemp =
              accumulatedData.chamber_temper !== undefined
                ? Math.round(Number(accumulatedData.chamber_temper))
                : undefined;

            const progressPercent =
              accumulatedData.mc_percent !== undefined
                ? Number(accumulatedData.mc_percent)
                : undefined;
            const remainingTimeMin =
              accumulatedData.mc_remaining_time !== undefined
                ? Number(accumulatedData.mc_remaining_time)
                : undefined;
            const currentLayer =
              accumulatedData.layer_num !== undefined
                ? Number(accumulatedData.layer_num)
                : undefined;
            const totalLayers =
              accumulatedData.total_layer_num !== undefined
                ? Number(accumulatedData.total_layer_num)
                : undefined;

            const gcodeState = String(accumulatedData.gcode_state || "").toUpperCase();
            let status: BambuPrinterState["status"] = "READY";
            if (gcodeState === "RUNNING" || gcodeState === "PREPARE" || gcodeState === "SLICING") {
              status = "PRINTING";
            } else if (gcodeState === "PAUSE") {
              status = "PAUSED";
            } else if (gcodeState === "FINISH" || gcodeState === "IDLE") {
              status = "READY";
            } else if (gcodeState === "FAILED") {
              status = "ERROR";
            }

            const speedLevel =
              accumulatedData.spd_lvl !== undefined ? Number(accumulatedData.spd_lvl) : 2;

            // AMS Parsing
            let amsData: BambuPrinterState["ams"] | undefined;
            if (accumulatedData.ams && Array.isArray(accumulatedData.ams.ams)) {
              const primaryAms = accumulatedData.ams.ams[0];
              if (primaryAms && Array.isArray(primaryAms.tray)) {
                amsData = {
                  humidity: primaryAms.humidity ? Number(primaryAms.humidity) : undefined,
                  activeTray: accumulatedData.ams.tray_tar
                    ? Number(accumulatedData.ams.tray_tar)
                    : undefined,
                  trays: primaryAms.tray.map((t: any, idx: number) => ({
                    id: idx + 1,
                    material: t.tray_sub_brands || t.tray_type || "PLA",
                    color: t.tray_color ? `#${t.tray_color.slice(0, 6)}` : undefined,
                    remain: t.remain ? Number(t.remain) : undefined,
                  })),
                };
              }
            }

            finish({
              connected: true,
              latencyMs,
              gcodeState,
              status,
              nozzleTemp,
              targetNozzleTemp,
              bedTemp,
              targetBedTemp,
              chamberTemp,
              progressPercent,
              remainingTimeMin,
              currentLayer,
              totalLayers,
              subtaskName: accumulatedData.subtask_name || accumulatedData.gcode_file,
              speedLevel,
              fanSpeed: accumulatedData.cooling_fan_speed
                ? Number(accumulatedData.cooling_fan_speed)
                : undefined,
              auxFanSpeed: accumulatedData.big_fan1_speed
                ? Number(accumulatedData.big_fan1_speed)
                : undefined,
              chamberLight: accumulatedData.lights_report?.[0]?.mode === "on",
              serialNumber: this.serialNumber,
              firmware: accumulatedData.module?.[0]?.sw_ver || "Bambu OS",
              wifiSignal: accumulatedData.wifi_signal,
              ams: amsData,
              message: `Bambu Lab conectada com sucesso via MQTT (${gcodeState || "Pronta"}).`,
            });
          }
        } catch {
          // Continua aguardando se json estiver incompleto
        }
      });

      client.on("error", (err) => {
        const msg = err.message || "";
        const isRefused = msg.includes("ECONNREFUSED");
        const isAuthFailed =
          msg.includes("Not authorized") ||
          msg.includes("not authorized") ||
          msg.includes("Bad username or password");

        let advice =
          "Verifique se a impressora está ligada, se o IP está acessível e se o Código de Acesso está correto.";
        if (isRefused) {
          advice =
            "A porta 8883 foi recusada (ECONNREFUSED). O firmware da Bambu Lab requer que o 'Modo Apenas LAN' esteja ativado na tela touch da impressora em Configurações > Rede para permitir conexões MQTT no IP local.";
        } else if (isAuthFailed) {
          advice =
            "Código de Acesso (Access Code) incorreto. Obtenha o código de 8 caracteres exibido na tela da impressora em Configurações > Rede / WLAN e insira no campo 'Código de Acesso'.";
        }

        fail(`Erro de conexão MQTT Bambu: ${msg}`, advice);
      });

      setTimeout(() => {
        fail(
          `Timeout de resposta MQTT em ${this.ip}:${this.port}. A impressora não respondeu em ${timeoutMs / 1000}s.`,
          "Verifique se o 'Modo Apenas LAN' está ativado na tela da impressora e se o Código de Acesso (8 caracteres) e o Número de Série estão corretos.",
        );
      }, timeoutMs);
    });
  }

  /**
   * Envia comando de controle para a impressora via tópico request
   */
  async sendCommand(commandPayload: Record<string, any>, timeoutMs = 5000): Promise<void> {
    const connectMqtt = mqtt.connect || (mqtt as any).default?.connect;

    return new Promise<void>((resolve, reject) => {
      let resolved = false;
      const requestTopic = `device/${this.serialNumber}/request`;

      const client = connectMqtt(`mqtts://${this.ip}:${this.port}`, {
        username: "bblp",
        password: this.accessCode,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        ciphers: "DEFAULT:@SECLEVEL=0",
        clientId: `bambu_cmd_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        protocolVersion: 4,
        keepalive: 60,
        clean: true,
        connectTimeout: 4000,
        reconnectPeriod: 0,
      } as any);

      const finish = () => {
        if (resolved) return;
        resolved = true;
        try {
          client.end(true);
        } catch {}
        resolve();
      };

      const fail = (err: Error) => {
        if (resolved) return;
        resolved = true;
        try {
          client.end(true);
        } catch {}
        reject(err);
      };

      client.on("connect", () => {
        client.publish(requestTopic, JSON.stringify(commandPayload), { qos: 0 }, (err) => {
          if (err) fail(err);
          else finish();
        });
      });

      client.on("error", fail);

      setTimeout(() => {
        fail(new Error("Timeout ao enviar comando MQTT para a Bambu Lab."));
      }, timeoutMs);
    });
  }

  // Comandos de conveniência equivalentes à biblioteca BambuTools/bambulabs_api
  async turnLightOn(): Promise<void> {
    return this.sendCommand({
      system: {
        sequence_id: "0",
        command: "ledctrl",
        led_node: "chamber_light",
        led_mode: "on",
      },
    });
  }

  async turnLightOff(): Promise<void> {
    return this.sendCommand({
      system: {
        sequence_id: "0",
        command: "ledctrl",
        led_node: "chamber_light",
        led_mode: "off",
      },
    });
  }

  async pause(): Promise<void> {
    return this.sendCommand({
      print: {
        sequence_id: "0",
        command: "pause",
      },
    });
  }

  async resume(): Promise<void> {
    return this.sendCommand({
      print: {
        sequence_id: "0",
        command: "resume",
      },
    });
  }

  async stop(): Promise<void> {
    return this.sendCommand({
      print: {
        sequence_id: "0",
        command: "stop",
      },
    });
  }

  async setSpeed(level: 1 | 2 | 3 | 4): Promise<void> {
    return this.sendCommand({
      print: {
        sequence_id: "0",
        command: "print_speed",
        param: String(level),
      },
    });
  }

  async sendGcode(gcode: string): Promise<void> {
    return this.sendCommand({
      print: {
        sequence_id: "0",
        command: "gcode_line",
        param: `${gcode.trim()}\n`,
      },
    });
  }

  async setNozzleTemp(temp: number): Promise<void> {
    return this.sendGcode(`M104 S${temp}`);
  }

  async setBedTemp(temp: number): Promise<void> {
    return this.sendGcode(`M140 S${temp}`);
  }

  async home(): Promise<void> {
    return this.sendGcode("G28");
  }

  disconnect(): void {
    if (this.client) {
      try {
        this.client.end(true);
      } catch {}
      this.client = null;
    }
  }
}
