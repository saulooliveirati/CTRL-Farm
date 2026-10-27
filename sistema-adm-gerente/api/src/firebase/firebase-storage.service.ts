import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { FirebaseService } from "./firebase.service.js";

@Injectable()
export class FirebaseStorageService {
  private readonly logger = new Logger(FirebaseStorageService.name);
  private localBaseDir: string;

  constructor(private readonly firebase: FirebaseService) {
    this.localBaseDir = path.resolve(process.cwd(), "storage");
    if (!fs.existsSync(this.localBaseDir)) {
      try {
        fs.mkdirSync(this.localBaseDir, { recursive: true });
      } catch {
        // ignore
      }
    }
  }

  /**
   * Sanitiza e valida o caminho de armazenamento, prevenindo Path Traversal (CWE-22)
   */
  public sanitizeStoragePath(relativePath: string): { cleanPath: string; localFullPath: string } {
    if (!relativePath || typeof relativePath !== "string") {
      throw new BadRequestException("Caminho de arquivo inválido ou não informado.");
    }

    let clean = relativePath.replace(/\0/g, "").replace(/\\/g, "/").trim();
    clean = clean.replace(/^\/+/, "").replace(/\/+$/, "");

    if (clean.includes("..") || clean.startsWith("/")) {
      this.logger.warn(`[Segurança Storage ADM] Tentativa de Path Traversal bloqueada: ${relativePath}`);
      throw new BadRequestException("Caminho não autorizado (path traversal detectado).");
    }

    const localFullPath = path.resolve(this.localBaseDir, clean);
    const normalizedBase = path.normalize(this.localBaseDir) + path.sep;
    const normalizedFull = path.normalize(localFullPath);

    if (!normalizedFull.startsWith(normalizedBase) && normalizedFull !== path.normalize(this.localBaseDir)) {
      this.logger.warn(`[Segurança Storage ADM] Caminho fora da raiz enjaulada: ${localFullPath}`);
      throw new BadRequestException("Acesso negado fora do repositório de arquivos.");
    }

    return { cleanPath: clean, localFullPath };
  }

  async uploadReleasePackage(
    version: string,
    buffer: Buffer,
    fileName: string
  ): Promise<{ url: string; path: string; isCloud: boolean }> {
    // Sanitiza versão e nome do arquivo
    const safeVersion = version.replace(/[^a-zA-Z0-9._-]/g, "");
    const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "");
    const { cleanPath, localFullPath } = this.sanitizeStoragePath(`releases/${safeVersion}/${safeFileName}`);

    const storage = this.firebase.getStorage();
    if (storage) {
      try {
        const bucket = storage.bucket();
        const file = bucket.file(cleanPath);

        await file.save(buffer, {
          metadata: { contentType: "application/zip" },
          resumable: false,
        });

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${cleanPath}`;
        this.logger.log(`[Firebase Storage ADM] Pacote de atualização ${safeVersion} enviado para nuvem: ${publicUrl}`);

        return { url: publicUrl, path: cleanPath, isCloud: true };
      } catch (err: any) {
        this.logger.warn(`[Firebase Storage ADM] Falha no upload para o bucket: ${err.message}. Salvando localmente...`);
      }
    }

    const parentDir = path.dirname(localFullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(localFullPath, buffer);

    return {
      url: `/storage/${cleanPath}`,
      path: cleanPath,
      isCloud: false,
    };
  }

  async getDownloadUrl(relativePath: string): Promise<string> {
    const { cleanPath } = this.sanitizeStoragePath(relativePath);
    const storage = this.firebase.getStorage();
    if (storage) {
      try {
        const bucket = storage.bucket();
        return `https://storage.googleapis.com/${bucket.name}/${cleanPath}`;
      } catch {
        // fallback
      }
    }
    return `/storage/${cleanPath}`;
  }
}
