import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { CreateReleaseDto } from "./dto/create-release.dto.js";

@Injectable()
export class UpdatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.updateRelease.findMany({
      orderBy: { releaseDate: "desc" },
    });
  }

  async findOne(id: string) {
    const release = await this.prisma.updateRelease.findUnique({ where: { id } });
    if (!release) throw new NotFoundException(`Release ${id} não encontrada.`);
    return release;
  }

  async create(dto: CreateReleaseDto, adminUsername?: string) {
    const existing = await this.prisma.updateRelease.findUnique({
      where: { version: dto.version.trim() },
    });
    if (existing) {
      throw new ConflictException(`A versão ${dto.version} já foi cadastrada.`);
    }

    const release = await this.prisma.updateRelease.create({
      data: {
        version: dto.version.trim(),
        title: dto.title.trim(),
        description: dto.description.trim(),
        changelog: dto.changelog,
        isMandatory: dto.isMandatory ?? false,
        isCritical: dto.isCritical ?? false,
        downloadUrl: dto.downloadUrl || null,
        checksumSha256: dto.checksumSha256 || null,
        status: "PUBLISHED",
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: "UPDATE_PUBLISHED",
        performedBy: adminUsername || "Administrador",
        targetType: "UPDATE",
        targetId: release.id,
        details: { version: release.version, isMandatory: release.isMandatory },
      },
    });

    return release;
  }

  /**
   * Endpoint consultado pelo cliente CTRL-Farm para verificar novas versões
   */
  async checkUpdate(clientVersion?: string) {
    const latest = await this.prisma.updateRelease.findFirst({
      where: { status: "PUBLISHED" },
      orderBy: { releaseDate: "desc" },
    });

    if (!latest) {
      return { updateAvailable: false, message: "Nenhuma atualização disponível no momento." };
    }

    const cleanClient = (clientVersion || "").trim().toLowerCase();
    const cleanLatest = latest.version.trim().toLowerCase();

    const isDifferent = cleanClient !== cleanLatest && cleanClient !== "";

    return {
      updateAvailable: isDifferent,
      currentClientVersion: clientVersion || "Unknown",
      latestVersion: latest.version,
      title: latest.title,
      description: latest.description,
      releaseDate: latest.releaseDate,
      isMandatory: latest.isMandatory,
      isCritical: latest.isCritical,
      changelog: latest.changelog,
      downloadUrl: latest.downloadUrl,
      checksumSha256: latest.checksumSha256,
    };
  }
}
