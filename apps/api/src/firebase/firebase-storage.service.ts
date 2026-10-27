import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { FirebaseService } from "./firebase.service.js";

export interface StoredFileInfo {
  storagePath: string;
  publicUrl: string;
  isCloud: boolean;
  sizeBytes?: number;
}

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

    // Remove caracteres nulos e normaliza separadores
    let clean = relativePath.replace(/\0/g, "").replace(/\\/g, "/").trim();

    // Remove barras iniciais e finais
    clean = clean.replace(/^\/+/, "").replace(/\/+$/, "");

    // Detecção estrita de path traversal
    if (clean.includes("..") || clean.startsWith("/")) {
      this.logger.warn(`[Segurança Storage] Tentativa de Path Traversal bloqueada: ${relativePath}`);
      throw new BadRequestException("Caminho de arquivo não autorizado (path traversal detectado).");
    }

    // Garante que o caminho resolvido local fique estritamente contido no diretório base
    const localFullPath = path.resolve(this.localBaseDir, clean);
    const normalizedBase = path.normalize(this.localBaseDir) + path.sep;
    const normalizedFull = path.normalize(localFullPath);

    if (!normalizedFull.startsWith(normalizedBase) && normalizedFull !== path.normalize(this.localBaseDir)) {
      this.logger.warn(`[Segurança Storage] Caminho fora da raiz enjaulada: ${localFullPath}`);
      throw new BadRequestException("Acesso negado fora do repositório de arquivos.");
    }

    return { cleanPath: clean, localFullPath };
  }

  /**
   * Faz upload de arquivo para o Firebase Cloud Storage ou para armazenamento local
   */
  async uploadFile(
    relativePath: string,
    buffer: Buffer,
    contentType: string = "application/octet-stream"
  ): Promise<StoredFileInfo> {
    const { cleanPath, localFullPath } = this.sanitizeStoragePath(relativePath);

    // 1. Tenta Firebase Cloud Storage se configurado
    const storage = this.firebase.getStorage();
    if (storage) {
      try {
        const bucket = storage.bucket();
        const file = bucket.file(cleanPath);

        await file.save(buffer, {
          metadata: {
            contentType,
          },
          resumable: false,
        });

        // Tenta obter URL pública ou assinada de longa duração
        let publicUrl = "";
        try {
          publicUrl = `https://storage.googleapis.com/${bucket.name}/${cleanPath}`;
        } catch {
          const [signedUrl] = await file.getSignedUrl({
            action: "read",
            expires: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 ano
          });
          publicUrl = signedUrl;
        }

        this.logger.log(`[Firebase Storage] Arquivo enviado para nuvem: ${cleanPath}`);
        return {
          storagePath: cleanPath,
          publicUrl,
          isCloud: true,
          sizeBytes: buffer.length,
        };
      } catch (err: any) {
        this.logger.warn(
          `[Firebase Storage] Falha ao enviar para o bucket cloud: ${err.message}. Salvando no armazenamento local...`
        );
      }
    }

    // 2. Fallback: Armazenamento local seguro
    const parentDir = path.dirname(localFullPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(localFullPath, buffer);

    return {
      storagePath: cleanPath,
      publicUrl: `/storage/${cleanPath}`,
      isCloud: false,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Obtém o conteúdo em Buffer de um arquivo
   */
  async downloadFile(relativePath: string): Promise<Buffer> {
    const { cleanPath, localFullPath } = this.sanitizeStoragePath(relativePath);

    const storage = this.firebase.getStorage();
    if (storage) {
      try {
        const file = storage.bucket().file(cleanPath);
        const [exists] = await file.exists();
        if (exists) {
          const [buf] = await file.download();
          return buf;
        }
      } catch (err: any) {
        this.logger.warn(`[Firebase Storage] Erro ao baixar da nuvem: ${err.message}`);
      }
    }

    if (fs.existsSync(localFullPath)) {
      return fs.readFileSync(localFullPath);
    }

    throw new Error(`Arquivo não encontrado: ${cleanPath}`);
  }

  /**
   * Remove arquivo do Firebase Storage ou local
   */
  async deleteFile(relativePath: string): Promise<boolean> {
    const { cleanPath, localFullPath } = this.sanitizeStoragePath(relativePath);

    const storage = this.firebase.getStorage();
    if (storage) {
      try {
        const file = storage.bucket().file(cleanPath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          this.logger.log(`[Firebase Storage] Arquivo deletado da nuvem: ${cleanPath}`);
        }
      } catch (err: any) {
        this.logger.warn(`[Firebase Storage] Erro ao deletar da nuvem: ${err.message}`);
      }
    }

    if (fs.existsSync(localFullPath)) {
      try {
        fs.unlinkSync(localFullPath);
      } catch {
        // ignore
      }
    }

    return true;
  }

  /**
   * Gera URL de download assinada para acesso temporário seguro
   */
  async getSignedUrl(relativePath: string, expiresInMinutes: number = 60): Promise<string> {
    const { cleanPath } = this.sanitizeStoragePath(relativePath);

    const storage = this.firebase.getStorage();
    if (storage) {
      try {
        const file = storage.bucket().file(cleanPath);
        const [url] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + expiresInMinutes * 60 * 1000,
        });
        return url;
      } catch (err: any) {
        this.logger.warn(`[Firebase Storage] Falha ao gerar URL assinada: ${err.message}`);
      }
    }

    return `/storage/${cleanPath}`;
  }
}
