import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreateCatalogProjectFileDto } from "./dto/create-catalog-project-file.dto.js";
import { ParseLinkDto } from "./dto/parse-link.dto.js";
import { UpdateProjectFileDto } from "./dto/update-project-file.dto.js";
import { ProjectFilesService } from "./project-files.service.js";

type UploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

function ensureCanManageProjects(user: AuthenticatedUser) {
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    throw new ForbiddenException(
      "Apenas Moderadores e Administradores possuem permissão para cadastrar, editar ou excluir projetos.",
    );
  }
}

@ApiTags("Project files")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("project-files")
export class ProjectFilesController {
  constructor(private readonly files: ProjectFilesService) {}

  @Get()
  @ApiOperation({ summary: "Lista arquivos de projetos da empresa" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.files.findAll(user.companyId);
  }

  @Post("parse-link")
  @ApiOperation({
    summary:
      "Extrai automaticamente metadados de links de plataformas 3D (MakerWorld, Printables, etc.)",
  })
  parseLink(@CurrentUser() user: AuthenticatedUser, @Body() dto: ParseLinkDto) {
    ensureCanManageProjects(user);
    return this.files.parseLink(dto.url);
  }

  @Post("catalog")
  @ApiOperation({
    summary: "Cadastra projeto via catálogo/link sem upload binário imediato",
  })
  createCatalog(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCatalogProjectFileDto) {
    ensureCanManageProjects(user);
    return this.files.createCatalog(user.companyId, dto);
  }

  @Post()
  @ApiOperation({ summary: "Envia e cataloga arquivo binário de projeto 3D" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    }),
  )
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: UploadFile | undefined,
    @Body() body: Record<string, string>,
  ) {
    ensureCanManageProjects(user);
    if (!file) throw new BadRequestException("Selecione um arquivo.");
    return this.files.upload(user.companyId, file, body);
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Baixa o arquivo de projeto 3D" })
  async download(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Res() response: Response,
  ) {
    const download = await this.files.download(user.companyId, id);
    const dispositionType = download.mimeType.startsWith("image/") ? "inline" : "attachment";
    response.setHeader("Content-Type", download.mimeType);
    response.setHeader("Content-Length", download.buffer.length);
    response.setHeader(
      "Content-Disposition",
      `${dispositionType}; filename*=UTF-8''${encodeURIComponent(download.originalName)}`,
    );
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.send(download.buffer);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza informações do projeto 3D" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectFileDto,
  ) {
    ensureCanManageProjects(user);
    return this.files.update(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Exclui um projeto e seu arquivo físico" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    ensureCanManageProjects(user);
    return this.files.remove(user.companyId, id);
  }
}
