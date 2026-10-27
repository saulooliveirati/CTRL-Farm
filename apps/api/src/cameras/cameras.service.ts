import { ChildProcess, spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { createConnection, isIP, Socket } from "node:net";
import * as path from "node:path";
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CameraQuality, type Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { CreateCameraDto } from "./dto/create-camera.dto.js";
import { UpdateCameraDto } from "./dto/update-camera.dto.js";

type CameraSecret = { passwordCiphertext: string; passwordIv: string; passwordTag: string };
const cameraSelect = {
  id: true,
  companyId: true,
  name: true,
  model: true,
  ipAddress: true,
  quality: true,
  username: true,
  streamPath: true,
  streamConfigured: true,
  createdAt: true,
  passwordCiphertext: true,
  passwordIv: true,
  passwordTag: true,
} satisfies Prisma.CameraSelect;

@Injectable()
export class CamerasService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(CamerasService.name);
  private readonly mediaApi: string;
  private readonly mediaAuthorization: string;
  private readonly cryptoKey: Buffer;
  private mediaProcess: ChildProcess | null = null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.mediaApi = config.get<string>("MEDIAMTX_API_URL") ?? "http://127.0.0.1:9998";
    const mediaPassword = config.get<string>("MEDIAMTX_API_PASSWORD");
    this.mediaAuthorization = mediaPassword
      ? `Basic ${Buffer.from(`${config.get<string>("MEDIAMTX_API_USER") ?? "ctrlfarm-api"}:${mediaPassword}`).toString("base64")}`
      : "";
    this.cryptoKey = createHash("sha256")
      .update(
        config.get<string>("CAMERA_ENCRYPTION_KEY") ?? config.getOrThrow<string>("JWT_SECRET"),
      )
      .update("ctrlfarm:camera-password:v2")
      .digest();
  }

  async onModuleInit() {
    await this.ensureMediaMtxRunning().catch(() => {});
    const savedCameras = await this.prisma.camera.findMany({ select: cameraSelect });
    for (const camera of savedCameras) {
      await this.configureAndSave(camera).catch(() => {
        /* MediaMTX may be offline during boot, will retry on reconnect */
      });
    }
  }

  onApplicationShutdown() {
    if (this.mediaProcess && !this.mediaProcess.killed) {
      try {
        this.mediaProcess.kill();
      } catch {}
    }
  }

  /**
   * Garante que o servidor de transmissão MediaMTX está rodando e pronto
   */
  async ensureMediaMtxRunning(): Promise<boolean> {
    try {
      const res = await fetch(`${this.mediaApi}/v3/config/paths/list`, {
        headers: this.mediaAuthorization ? { Authorization: this.mediaAuthorization } : {},
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) return true;
    } catch {
      // Offline, tenta auto-iniciar
    }

    const possibleBases = [
      process.cwd(),
      path.resolve(process.cwd(), "../.."),
      path.resolve(process.cwd(), ".."),
    ];

    let exePath = "";
    let ymlPath = "";

    for (const base of possibleBases) {
      const candidateExe = path.join(base, "bin", "mediamtx", "mediamtx.exe");
      const candidateYml = path.join(base, "bin", "mediamtx", "mediamtx.yml");
      if (existsSync(candidateExe) && existsSync(candidateYml)) {
        exePath = candidateExe;
        ymlPath = candidateYml;
        break;
      }
    }

    if (!exePath) {
      this.logger.warn("[CamerasService] Binário mediamtx.exe não encontrado nas pastas do projeto.");
      return false;
    }

    try {
      this.logger.log(`[CamerasService] Iniciando MediaMTX automaticamente: ${exePath}`);
      this.mediaProcess = spawn(exePath, [ymlPath], {
        detached: true,
        stdio: "ignore",
      });
      this.mediaProcess.unref();

      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 500));
        try {
          const res = await fetch(`${this.mediaApi}/v3/config/paths/list`, {
            headers: this.mediaAuthorization ? { Authorization: this.mediaAuthorization } : {},
            signal: AbortSignal.timeout(1000),
          });
          if (res.ok) {
            this.logger.log("[CamerasService] MediaMTX está online e operacional!");
            return true;
          }
        } catch {}
      }
    } catch (err: any) {
      this.logger.error(`[CamerasService] Falha ao iniciar MediaMTX: ${err.message}`);
    }

    return false;
  }

  async findAll(companyId: string) {
    const cameras = await this.prisma.camera.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: cameraSelect,
    });
    return cameras.map(
      ({ passwordCiphertext: _cipher, passwordIv: _iv, passwordTag: _tag, ...camera }) => camera,
    );
  }

  async create(companyId: string, dto: CreateCameraDto) {
    this.assertPrivateIp(dto.ipAddress);
    const id = randomUUID();
    const rawPassword = dto.password ?? "";
    const secret = this.encrypt(rawPassword);
    let camera;
    try {
      camera = await this.prisma.camera.create({
        data: {
          id,
          companyId,
          name: dto.name.trim(),
          model: dto.model?.trim() || null,
          ipAddress: dto.ipAddress,
          quality: dto.quality ?? CameraQuality.HIGH,
          username: dto.username?.trim() || "admin",
          ...secret,
          streamPath: `cam_${id.replaceAll("-", "")}`,
        },
        select: cameraSelect,
      });
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Já existe uma câmera com este nome na empresa.");
      }
      throw error;
    }
    return this.configureAndSave(camera);
  }

  async update(companyId: string, id: string, dto: UpdateCameraDto) {
    await this.findOwned(companyId, id);
    if (dto.ipAddress) this.assertPrivateIp(dto.ipAddress);
    const secret = dto.password !== undefined ? this.encrypt(dto.password) : {};
    try {
      const updated = await this.prisma.camera.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.model !== undefined && { model: dto.model?.trim() || null }),
          ...(dto.ipAddress !== undefined && { ipAddress: dto.ipAddress }),
          ...(dto.quality !== undefined && { quality: dto.quality }),
          ...(dto.username !== undefined && { username: dto.username.trim() }),
          ...secret,
          streamConfigured: false,
        },
        select: cameraSelect,
      });
      return this.configureAndSave(updated);
    } catch (error: unknown) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException("Já existe uma câmera com este nome na empresa.");
      }
      throw error;
    }
  }

  async reconnect(companyId: string, id: string) {
    await this.ensureMediaMtxRunning().catch(() => {});
    return this.configureAndSave(await this.findOwned(companyId, id));
  }

  /**
   * Testa a conectividade física e autenticação de uma câmera existente
   */
  async testConnection(companyId: string, id: string) {
    const camera = await this.findOwned(companyId, id);
    const password = this.decrypt(camera);
    const isMtxUp = await this.ensureMediaMtxRunning().catch(() => false);

    const probe = await this.probeCamera(
      camera.ipAddress,
      camera.model,
      camera.quality,
      camera.username,
      password,
    );

    return {
      cameraId: camera.id,
      cameraName: camera.name,
      ipAddress: camera.ipAddress,
      mediaServerRunning: isMtxUp,
      streamConfigured: camera.streamConfigured,
      ...probe,
    };
  }

  /**
   * Testa as credenciais informadas pelo usuário antes de salvar o cadastro
   */
  async testDraftConnection(dto: CreateCameraDto) {
    this.assertPrivateIp(dto.ipAddress);
    const isMtxUp = await this.ensureMediaMtxRunning().catch(() => false);

    const probe = await this.probeCamera(
      dto.ipAddress,
      dto.model ?? null,
      dto.quality ?? CameraQuality.HIGH,
      dto.username,
      dto.password,
    );

    return {
      ipAddress: dto.ipAddress,
      mediaServerRunning: isMtxUp,
      ...probe,
    };
  }

  /**
   * Executa teste de conectividade e handshake de autenticação direto na câmera
   */
  async probeCamera(
    ip: string,
    model: string | null,
    quality: CameraQuality,
    username?: string,
    password?: string,
  ): Promise<{
    reachable: boolean;
    authenticated: boolean;
    statusCode?: number;
    errorType?: "NETWORK_TIMEOUT" | "AUTH_FAILED" | "PROTOCOL_ERROR";
    message: string;
  }> {
    const modelLower = (model ?? "").toLowerCase();
    const isMjpeg =
      modelLower.includes("klipper") ||
      modelLower.includes("moonraker") ||
      modelLower.includes("fluidd") ||
      modelLower.includes("mainsail") ||
      modelLower.includes("octoprint") ||
      modelLower.includes("octopi") ||
      modelLower.includes("flashforge");

    if (isMjpeg) {
      try {
        const streamUrl = `http://${ip}:8080/?action=stream`;
        const res = await fetch(streamUrl, {
          method: "GET",
          signal: AbortSignal.timeout(3000),
        });
        const contentType = res.headers.get("content-type") || "";
        const isOk =
          res.ok || contentType.includes("mixed-replace") || contentType.includes("image");
        if (isOk) {
          return {
            reachable: true,
            authenticated: true,
            statusCode: res.status,
            message: "Fluxo MJPEG detectado e respondendo na porta 8080.",
          };
        }
        return {
          reachable: true,
          authenticated: false,
          statusCode: res.status,
          message: `Câmera MJPEG respondeu com status ${res.status}.`,
        };
      } catch (err: any) {
        return {
          reachable: false,
          authenticated: false,
          errorType: "NETWORK_TIMEOUT",
          message: `Não foi possível conectar ao fluxo MJPEG em http://${ip}:8080 (${err.message}).`,
        };
      }
    }

    // Câmera RTSP (Tapo, Bambu, Intelbras, Hikvision, etc.)
    const port = modelLower.includes("bambu") ? 322 : 554;
    const streamPath =
      quality === CameraQuality.HIGH
        ? modelLower.includes("bambu")
          ? "live"
          : "stream1"
        : "stream2";

    return new Promise((resolve) => {
      let resolved = false;
      const finish = (result: any) => {
        if (resolved) return;
        resolved = true;
        try {
          client.destroy();
        } catch (_) {}
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish({
          reachable: false,
          authenticated: false,
          errorType: "NETWORK_TIMEOUT",
          message: `Tempo limite esgotado ao conectar em ${ip}:${port}. Verifique se a câmera está ligada e na mesma rede local.`,
        });
      }, 3500);

      const client: Socket = createConnection({ host: ip, port }, () => {
        const uri = `rtsp://${ip}:${port}/${streamPath}`;
        client.write(`OPTIONS ${uri} RTSP/1.0\r\nCSeq: 1\r\nUser-Agent: CTRL-Farm\r\n\r\n`);
      });

      let step = "OPTIONS";

      client.on("data", (data) => {
        const str = data.toString();
        const firstLine = str.split("\r\n")[0] || "";

        if (step === "OPTIONS") {
          step = "DESCRIBE_UNAUTH";
          const uri = `rtsp://${ip}:${port}/${streamPath}`;
          client.write(`DESCRIBE ${uri} RTSP/1.0\r\nCSeq: 2\r\nUser-Agent: CTRL-Farm\r\n\r\n`);
          return;
        }

        if (step === "DESCRIBE_UNAUTH") {
          if (firstLine.includes("200")) {
            clearTimeout(timer);
            return finish({
              reachable: true,
              authenticated: true,
              statusCode: 200,
              message: "Conexão estabelecida com sucesso sem senha.",
            });
          }

          if (firstLine.includes("401")) {
            if (!username || !password) {
              clearTimeout(timer);
              return finish({
                reachable: true,
                authenticated: false,
                statusCode: 401,
                errorType: "AUTH_FAILED",
                message: "A câmera respondeu na rede local, mas exige usuário e senha RTSP.",
              });
            }

            const realmMatch = str.match(/realm="([^"]+)"/);
            const nonceMatch = str.match(/nonce="([^"]+)"/);
            const uri = `rtsp://${ip}:${port}/${streamPath}`;

            step = "DESCRIBE_AUTH";
            if (realmMatch && nonceMatch) {
              const realm = realmMatch[1];
              const nonce = nonceMatch[1];
              const ha1 = createHash("md5")
                .update(`${username}:${realm}:${password}`)
                .digest("hex");
              const ha2 = createHash("md5").update(`DESCRIBE:${uri}`).digest("hex");
              const resp = createHash("md5").update(`${ha1}:${nonce}:${ha2}`).digest("hex");
              const authHeader = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${resp}"`;
              client.write(
                `DESCRIBE ${uri} RTSP/1.0\r\nCSeq: 3\r\nAuthorization: ${authHeader}\r\nUser-Agent: CTRL-Farm\r\n\r\n`,
              );
            } else {
              const creds = Buffer.from(`${username}:${password}`).toString("base64");
              client.write(
                `DESCRIBE ${uri} RTSP/1.0\r\nCSeq: 3\r\nAuthorization: Basic ${creds}\r\nUser-Agent: CTRL-Farm\r\n\r\n`,
              );
            }
            return;
          }

          clearTimeout(timer);
          return finish({
            reachable: true,
            authenticated: false,
            statusCode: parseInt(firstLine.split(" ")[1]) || 500,
            message: `Resposta inesperada da câmera: ${firstLine}`,
          });
        }

        if (step === "DESCRIBE_AUTH") {
          clearTimeout(timer);
          if (firstLine.includes("200")) {
            return finish({
              reachable: true,
              authenticated: true,
              statusCode: 200,
              message: "Autenticação e credenciais RTSP validadas com sucesso!",
            });
          }
          if (firstLine.includes("401")) {
            const isTapo = modelLower.includes("tapo");
            return finish({
              reachable: true,
              authenticated: false,
              statusCode: 401,
              errorType: "AUTH_FAILED",
              message: isTapo
                ? "A câmera foi localizada na rede (192.168.1.14:554), mas o usuário e senha foram recusados (401 Unauthorized). Em câmeras TP-Link Tapo, você deve usar a 'Conta da Câmera' criada no aplicativo Tapo (Configurações da Câmera > Configurações Avançadas > Conta da Câmera), e NÃO sua conta/e-mail do TP-Link ID."
                : "Usuário ou senha recusados pela câmera (401 Unauthorized). Verifique as credenciais locais cadastradas.",
            });
          }
          return finish({
            reachable: true,
            authenticated: false,
            statusCode: parseInt(firstLine.split(" ")[1]) || 500,
            message: `Falha na autenticação: ${firstLine}`,
          });
        }
      });

      client.on("error", (err) => {
        clearTimeout(timer);
        finish({
          reachable: false,
          authenticated: false,
          errorType: "NETWORK_TIMEOUT",
          message: `Falha ao conectar em ${ip}:${port} (${err.message}). Verifique se a câmera está ligada.`,
        });
      });
    });
  }

  async remove(companyId: string, id: string) {
    const camera = await this.findOwned(companyId, id);
    await this.deleteMediaPath(camera.streamPath);
    await this.prisma.camera.delete({ where: { id } });
    return { id };
  }

  private async configureAndSave(camera: Prisma.CameraGetPayload<{ select: typeof cameraSelect }>) {
    await this.ensureMediaMtxRunning().catch(() => {});
    let streamConfigured = false;
    try {
      await this.replaceMediaPath(camera);
      streamConfigured = true;
    } catch (err: any) {
      this.logger.warn(`[CamerasService] Falha ao configurar stream MediaMTX para ${camera.name}: ${err.message}`);
      streamConfigured = false;
    }
    const saved = await this.prisma.camera.update({
      where: { id: camera.id },
      data: { streamConfigured },
      select: cameraSelect,
    });
    const { passwordCiphertext: _cipher, passwordIv: _iv, passwordTag: _tag, ...safe } = saved;
    return safe;
  }

  private async replaceMediaPath(camera: Prisma.CameraGetPayload<{ select: typeof cameraSelect }>) {
    if (!this.mediaAuthorization) throw new Error("MEDIAMTX_API_PASSWORD não configurada.");
    const password = this.decrypt(camera);
    const username = camera.username || "";
    const ip = camera.ipAddress;
    const modelLower = (camera.model ?? "").toLowerCase();

    let sourceUrl = "";

    if (modelLower.includes("bambu")) {
      const user = username || "bblp";
      sourceUrl = password
        ? `rtsps://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${ip}:322/live`
        : `rtsp://${ip}:554/live`;
    } else if (
      modelLower.includes("klipper") ||
      modelLower.includes("moonraker") ||
      modelLower.includes("fluidd") ||
      modelLower.includes("mainsail")
    ) {
      sourceUrl = `http://${ip}:8080/?action=stream`;
    } else if (modelLower.includes("octoprint") || modelLower.includes("octopi")) {
      sourceUrl = `http://${ip}:8080/?action=stream`;
    } else if (
      modelLower.includes("creality") ||
      modelLower.includes("k1") ||
      modelLower.includes("nebula")
    ) {
      sourceUrl =
        username && password
          ? `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${ip}:554/live/ch0`
          : `http://${ip}:8080/?action=stream`;
    } else if (modelLower.includes("intelbras") || modelLower.includes("dahua")) {
      const subtype = camera.quality === CameraQuality.HIGH ? 0 : 1;
      sourceUrl = `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${ip}:554/cam/realmonitor?channel=1&subtype=${subtype}`;
    } else if (modelLower.includes("hikvision")) {
      const channel = camera.quality === CameraQuality.HIGH ? 101 : 102;
      sourceUrl = `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${ip}:554/Streaming/Channels/${channel}`;
    } else if (modelLower.includes("flashforge")) {
      sourceUrl = `http://${ip}:8080/?action=stream`;
    } else {
      const streamName = camera.quality === CameraQuality.HIGH ? "stream1" : "stream2";
      sourceUrl =
        username && password
          ? `rtsp://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${ip}:554/${streamName}`
          : `rtsp://${ip}:554/${streamName}`;
    }

    const response = await fetch(
      `${this.mediaApi}/v3/config/paths/replace/${encodeURIComponent(camera.streamPath)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: this.mediaAuthorization },
        body: JSON.stringify({
          source: sourceUrl,
          sourceOnDemand: false, // Mantém o fluxo permanentemente ativo e conectado
          rtspTransport: "tcp",
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!response.ok) {
      throw new Error(`MediaMTX recusou a configuração do fluxo (${response.status}).`);
    }
  }

  private async deleteMediaPath(path: string) {
    try {
      await fetch(`${this.mediaApi}/v3/config/paths/delete/${encodeURIComponent(path)}`, {
        method: "DELETE",
        headers: { Authorization: this.mediaAuthorization },
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      /* Media server may already be stopped. */
    }
  }

  private encrypt(password: string): CameraSecret {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.cryptoKey, iv);
    const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
    return {
      passwordCiphertext: ciphertext.toString("base64"),
      passwordIv: iv.toString("base64"),
      passwordTag: cipher.getAuthTag().toString("base64"),
    };
  }

  private decrypt(camera: CameraSecret) {
    try {
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.cryptoKey,
        Buffer.from(camera.passwordIv, "base64"),
      );
      decipher.setAuthTag(Buffer.from(camera.passwordTag, "base64"));
      return Buffer.concat([
        decipher.update(Buffer.from(camera.passwordCiphertext, "base64")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      // Fallback for key rotation or legacy passwords
      return "";
    }
  }

  private assertPrivateIp(address: string) {
    if (isIP(address) !== 4) throw new ConflictException("Informe o IP IPv4 local da câmera.");
    const octets = address.split(".").map(Number);
    const privateAddress =
      octets[0] === 10 ||
      (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
      (octets[0] === 192 && octets[1] === 168);
    if (!privateAddress) {
      throw new ConflictException(
        "Por segurança, a câmera deve usar um IP privado da rede local (10.x, 172.16–31.x ou 192.168.x).",
      );
    }
  }

  private async findOwned(companyId: string, id: string) {
    const camera = await this.prisma.camera.findFirst({
      where: { id, companyId },
      select: cameraSelect,
    });
    if (!camera) throw new NotFoundException("Câmera não encontrada.");
    return camera;
  }

  private isUniqueViolation(error: unknown) {
    return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
  }
}
