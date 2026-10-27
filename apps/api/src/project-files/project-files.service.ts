import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaService } from "../database/prisma.service.js";
import { FirebaseStorageService } from "../firebase/firebase-storage.service.js";
import type { CreateCatalogProjectFileDto } from "./dto/create-catalog-project-file.dto.js";
import type { UpdateProjectFileDto } from "./dto/update-project-file.dto.js";

type UploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};
type UploadFields = Record<string, string | undefined>;

const allowedExtensions = new Set([
  ".stl",
  ".3mf",
  ".obj",
  ".step",
  ".stp",
  ".scad",
  ".blend",
  ".amf",
  ".zip",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".url",
]);

const VALID_CATEGORIES = new Set([
  "MODEL",
  "PROJECTS",
  "MARKETPLACE",
  "IDEAS",
  "DOCUMENTATION",
  "IMAGE",
  "OTHER",
]);

const storageRoot = process.env.CTRL_FARM_STORAGE_DIR
  ? resolve(process.cwd(), process.env.CTRL_FARM_STORAGE_DIR)
  : resolve(process.cwd(), "storage/projects");

function extractMeta(html: string, propName: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${propName}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${propName}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${propName}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${propName}["']`, "i"),
  ];
  for (const regex of patterns) {
    const match = html.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return null;
}

function detectPlatform(hostname: string): { name: string; key: string } {
  const h = hostname.toLowerCase();
  if (h.includes("makerworld")) return { name: "MakerWorld", key: "makerworld" };
  if (h.includes("printables")) return { name: "Printables", key: "printables" };
  if (h.includes("thingiverse")) return { name: "Thingiverse", key: "thingiverse" };
  if (h.includes("cults3d")) return { name: "Cults3D", key: "cults3d" };
  if (h.includes("thangs")) return { name: "Thangs", key: "thangs" };
  if (h.includes("crealitycloud")) return { name: "Creality Cloud", key: "crealitycloud" };
  if (h.includes("myminifactory")) return { name: "MyMiniFactory", key: "myminifactory" };
  return { name: "Web / Plataforma 3D", key: "web" };
}

function cleanProjectTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*\|\s*Printables\.com$/i, "")
    .replace(/\s*\|\s*MakerWorld$/i, "")
    .replace(/\s*-\s*Thingiverse$/i, "")
    .replace(/\s*·\s*Cults$/i, "")
    .replace(/\s*\|\s*Thangs$/i, "")
    .replace(/^3D file\s+/i, "")
    .replace(/^Free 3D file\s+/i, "")
    .trim();
}

function extractKeywords(title: string, platformKey: string): string[] {
  const tags: string[] = [platformKey];
  const lower = title.toLowerCase();
  const known = [
    "vaso",
    "suporte",
    "engrenagem",
    "case",
    "decoracao",
    "organizador",
    "ferramenta",
    "brinquedo",
    "miniatura",
    "articulado",
    "dragon",
    "pla",
    "petg",
    "abs",
    "bambu",
    "creality",
  ];
  for (const k of known) {
    if (lower.includes(k) && !tags.includes(k)) {
      tags.push(k);
    }
  }
  return tags;
}

@Injectable()
export class ProjectFilesService {
  private readonly logger = new Logger(ProjectFilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly firebaseStorage: FirebaseStorageService,
  ) {}

  findAll(companyId: string) {
    return this.prisma.projectFile.findMany({
      where: { companyId },
      include: { productionJob: { select: { id: true, name: true } } },
      orderBy: [{ createdAt: "desc" }, { projectName: "asc" }],
    });
  }

  private async queryGeminiForModelMetadata(
    urlStr: string,
    platformName: string,
  ): Promise<{
    title?: string;
    description?: string;
    author?: string;
    suggestedTags?: string[];
  } | null> {
    if (process.env.NODE_ENV === "test") return null;

    const apiKey =
      this.config.get<string>("GEMINI_API_KEY") ??
      process.env.GEMINI_API_KEY ??
      "AQ.Ab8RN6IdoHez-Jzwcj2ZqWA6nFpNkjrh4kDxsQ7Zz41pOFrl_g";
    if (!apiKey) return null;

    const models = ["gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"];
    const prompt = `Você é um assistente especialista em impressão 3D (STL, 3MF, FDM).
Analise o link e a plataforma do modelo 3D:
Plataforma: ${platformName}
URL: "${urlStr}"

Retorne ESTRITAMENTE um JSON válido com a seguinte estrutura:
{
  "title": "Título limpo, claro e descritivo do modelo 3D (máximo 100 caracteres)",
  "description": "Descrição detalhada do modelo, finalidade de uso e dicas de impressão 3D (material recomendado como PLA/PETG, preenchimento, suportes)",
  "author": "Nome do autor ou designer caso identificável pelo link ou nulo",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
            signal: AbortSignal.timeout(5000),
          },
        );
        if (!res.ok) continue;
        const data = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) continue;
        const parsed = JSON.parse(
          rawText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim(),
        );
        return {
          title: typeof parsed.title === "string" ? parsed.title.trim().slice(0, 120) : undefined,
          description:
            typeof parsed.description === "string" ? parsed.description.trim() : undefined,
          author: typeof parsed.author === "string" ? parsed.author.trim().slice(0, 80) : undefined,
          suggestedTags: Array.isArray(parsed.suggestedTags)
            ? parsed.suggestedTags
                .map((t: unknown) => String(t).trim().toLowerCase())
                .filter(Boolean)
            : undefined,
        };
      } catch (err) {
        this.logger.debug(`Gemini fallback com modelo ${model} falhou: ${err}`);
      }
    }
    return null;
  }

  async parseLink(urlStr: string) {
    const raw = urlStr.trim();
    if (!raw || raw.length < 5) {
      throw new BadRequestException("URL fornecida é inválida.");
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      if (!parsedUrl.hostname || !parsedUrl.hostname.includes(".")) {
        throw new BadRequestException("URL fornecida é inválida.");
      }
    } catch {
      throw new BadRequestException("URL fornecida é inválida.");
    }

    const platform = detectPlatform(parsedUrl.hostname);
    let title: string | null = null;
    let description: string | null = null;
    let coverImageUrl: string | null = null;
    let author: string | null = null;
    const aiTags: string[] = [];

    try {
      const response = await fetch(parsedUrl.toString(), {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        const html = await response.text();
        title = extractMeta(html, "og:title");
        if (!title) {
          const matchTitle = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          title = matchTitle?.[1] ? matchTitle[1].trim() : null;
        }

        description = extractMeta(html, "og:description") || extractMeta(html, "description");
        coverImageUrl = extractMeta(html, "og:image");
        author = extractMeta(html, "author") || extractMeta(html, "twitter:creator") || null;
      }
    } catch (err) {
      this.logger.debug(
        `Scraping direto falhou para ${parsedUrl.hostname}, tentando extração via IA ou fallback: ${err}`,
      );
    }

    // Se metadados estão ausentes ou insuficientes, usa Gemini IA para enriquecer
    if (!title || !description) {
      try {
        const aiMeta = await this.queryGeminiForModelMetadata(parsedUrl.toString(), platform.name);
        if (aiMeta) {
          if (!title && aiMeta.title) title = aiMeta.title;
          if (!description && aiMeta.description) description = aiMeta.description;
          if (!author && aiMeta.author) author = aiMeta.author;
          if (aiMeta.suggestedTags?.length) {
            aiTags.push(...aiMeta.suggestedTags);
          }
        }
      } catch (err) {
        this.logger.debug(`Consulta de IA falhou: ${err}`);
      }
    }

    // Fallback inteligente caso a página bloqueie scraping ou não tenha OpenGraph
    if (!title) {
      const segments = parsedUrl.pathname.split("/").filter(Boolean);
      const last = segments[segments.length - 1] ?? "Modelo 3D";
      title = decodeURIComponent(last)
        .replace(/^[0-9]+-/, "")
        .replace(/^thing:\s*/i, "")
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    const cleanTitle = cleanProjectTitle(title || "Novo Modelo STL");
    const safeTitle = cleanTitle.length >= 2 ? cleanTitle : "Novo Modelo STL";
    const baseTags = extractKeywords(safeTitle, platform.key);
    const suggestedTags = Array.from(new Set([...baseTags, ...aiTags])).slice(0, 30);

    return {
      success: true,
      platform: platform.name,
      platformKey: platform.key,
      title: safeTitle.slice(0, 120),
      description: description ? description.trim() : null,
      coverImageUrl,
      author,
      suggestedTags,
      externalUrl: parsedUrl.toString(),
    };
  }

  async createCatalog(companyId: string, dto: CreateCatalogProjectFileDto) {
    const rawName = (dto.projectName || "").trim();
    const projectName = rawName.length >= 2 ? rawName.slice(0, 255) : "Novo Modelo STL";

    const category = dto.category || "PROJECTS";
    if (!VALID_CATEGORIES.has(category)) {
      throw new BadRequestException("Categoria de projeto inválida.");
    }

    const productionJobId = dto.productionJobId?.trim() || undefined;
    if (productionJobId) {
      const job = await this.prisma.productionJob.findFirst({
        where: { id: productionJobId, companyId },
        select: { id: true },
      });
      if (!job) {
        throw new NotFoundException("Ordem de produção não encontrada nesta empresa.");
      }
    }

    // Constrói tags enriquecidas preservando urls e imagens
    const rawTags = (dto.tags ?? []).map((t) => t.trim()).filter(Boolean);
    const allTags = new Set(rawTags);
    if (dto.externalUrl?.trim()) {
      allTags.add(`url:${dto.externalUrl.trim()}`);
    }
    if (dto.coverImageUrl?.trim()) {
      allTags.add(`img:${dto.coverImageUrl.trim()}`);
    }

    // Cria arquivo atalho .url local para persistência de integridade
    const shortcutContent = `[InternetShortcut]\nURL=${dto.externalUrl?.trim() || "https://ctrlfarm.local"}\nProjectName=${projectName}\n`;
    const shortcutBuffer = Buffer.from(shortcutContent, "utf-8");
    const storedName = `${randomUUID()}.url`;
    const directory = resolve(storageRoot, companyId);
    const fullPath = resolve(directory, storedName);

    await mkdir(directory, { recursive: true });
    await writeFile(fullPath, shortcutBuffer, { flag: "wx" });

    try {
      return await this.prisma.projectFile.create({
        data: {
          companyId,
          productionJobId,
          projectName,
          version: dto.version?.trim().slice(0, 40) || null,
          category,
          description: dto.description?.trim() || null,
          tags: Array.from(allTags).slice(0, 200),
          originalName: `${projectName.replace(/[\\/\r\n]/g, "_").slice(0, 100)}.url`,
          storedName,
          mimeType: "application/x-url",
          sizeBytes: shortcutBuffer.length,
        },
        include: { productionJob: { select: { id: true, name: true } } },
      });
    } catch (error) {
      await unlink(fullPath).catch(() => undefined);
      throw error;
    }
  }

  async upload(companyId: string, file: UploadFile, fields: UploadFields) {
    const rawName = (fields.projectName ?? "").trim();
    const projectName = rawName.length >= 2 ? rawName.slice(0, 255) : "Novo Modelo STL";

    const extension = extname(file.originalname).toLowerCase();
    if (!allowedExtensions.has(extension))
      throw new BadRequestException(
        "Formato não permitido. Envie STL, 3MF, OBJ, STEP, SCAD, AMF, ZIP, PDF ou imagem.",
      );
    const category = fields.category || "PROJECTS";
    if (!VALID_CATEGORIES.has(category))
      throw new BadRequestException("Categoria de arquivo inválida.");
    const productionJobId = fields.productionJobId?.trim() || undefined;
    if (productionJobId) {
      const job = await this.prisma.productionJob.findFirst({
        where: { id: productionJobId, companyId },
        select: { id: true },
      });
      if (!job) throw new NotFoundException("Ordem de produção não encontrada nesta empresa.");
    }

    const rawTags = (fields.tags ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const allTags = new Set(rawTags);
    if (fields.externalUrl?.trim()) {
      allTags.add(`url:${fields.externalUrl.trim()}`);
    }
    if (fields.coverImageUrl?.trim()) {
      allTags.add(`img:${fields.coverImageUrl.trim()}`);
    }

    const storedName = `${randomUUID()}${extension}`;
    const relativeCloudPath = `companies/${companyId}/projects/${storedName}`;

    // Upload seguro para o Firebase Cloud Storage (com fallback automático se em modo local)
    await this.firebaseStorage.uploadFile(
      relativeCloudPath,
      file.buffer,
      file.mimetype || "application/octet-stream"
    );

    // Mantém cópia no disco local para compatibilidade com ferramentas de fatiamento locais
    const directory = resolve(storageRoot, companyId);
    const fullPath = resolve(directory, storedName);
    await mkdir(directory, { recursive: true });
    await writeFile(fullPath, file.buffer, { flag: "w" });
    try {
      return await this.prisma.projectFile.create({
        data: {
          companyId,
          productionJobId,
          projectName,
          version: fields.version?.trim().slice(0, 40) || null,
          category,
          description: fields.description?.trim() || null,
          tags: Array.from(allTags).slice(0, 200),
          originalName: file.originalname.replace(/[\\/\r\n]/g, "_").slice(0, 255),
          storedName,
          mimeType: file.mimetype || "application/octet-stream",
          sizeBytes: file.size,
        },
        include: { productionJob: { select: { id: true, name: true } } },
      });
    } catch (error) {
      await unlink(fullPath).catch(() => undefined);
      await this.firebaseStorage.deleteFile(relativeCloudPath).catch(() => undefined);
      throw error;
    }
  }

  async download(companyId: string, id: string) {
    const file = await this.prisma.projectFile.findFirst({
      where: { id, companyId },
    });
    if (!file) throw new NotFoundException("Arquivo não encontrado.");
    try {
      // Tenta obter do Firebase Storage primeiro
      const relativeCloudPath = `companies/${companyId}/projects/${file.storedName}`;
      const buffer = await this.firebaseStorage.downloadFile(relativeCloudPath);
      return {
        buffer,
        mimeType: file.mimeType,
        originalName: file.originalName,
      };
    } catch {
      try {
        const fullPath = resolve(storageRoot, companyId, file.storedName);
        return {
          buffer: await readFile(fullPath),
          mimeType: file.mimeType,
          originalName: file.originalName,
        };
      } catch {
        throw new NotFoundException("O arquivo não está disponível no armazenamento.");
      }
    }
  }

  async update(companyId: string, id: string, dto: UpdateProjectFileDto) {
    const file = await this.prisma.projectFile.findFirst({
      where: { id, companyId },
      select: { id: true, tags: true },
    });
    if (!file) throw new NotFoundException("Arquivo de projeto não encontrado.");

    const productionJobId = dto.productionJobId?.trim() || undefined;
    if (productionJobId) {
      const job = await this.prisma.productionJob.findFirst({
        where: { id: productionJobId, companyId },
        select: { id: true },
      });
      if (!job) throw new NotFoundException("Ordem de produção não encontrada nesta empresa.");
    }

    let finalTags = dto.tags;
    if (finalTags !== undefined) {
      const tagSet = new Set(finalTags.map((t) => t.trim()).filter(Boolean));
      if (dto.externalUrl?.trim()) {
        tagSet.add(`url:${dto.externalUrl.trim()}`);
      }
      if (dto.coverImageUrl?.trim()) {
        tagSet.add(`img:${dto.coverImageUrl.trim()}`);
      }
      finalTags = Array.from(tagSet).slice(0, 200);
    }

    return this.prisma.projectFile.update({
      where: { id },
      data: {
        ...(dto.projectName !== undefined && {
          projectName: dto.projectName.trim().slice(0, 255),
        }),
        ...(dto.version !== undefined && {
          version: dto.version ? dto.version.trim().slice(0, 40) : null,
        }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.description !== undefined && {
          description: dto.description ? dto.description.trim() : null,
        }),
        ...(finalTags !== undefined && { tags: finalTags }),
        ...(dto.productionJobId !== undefined && {
          productionJobId: productionJobId ?? null,
        }),
      },
      include: { productionJob: { select: { id: true, name: true } } },
    });
  }

  async remove(companyId: string, id: string) {
    const file = await this.prisma.projectFile.findFirst({
      where: { id, companyId },
    });
    if (!file) throw new NotFoundException("Arquivo não encontrado.");
    await this.prisma.projectFile.delete({ where: { id } });
    await this.firebaseStorage.deleteFile(`companies/${companyId}/projects/${file.storedName}`).catch(() => undefined);
    await unlink(resolve(storageRoot, companyId, file.storedName)).catch(() => undefined);
    return { id, success: true };
  }
}
