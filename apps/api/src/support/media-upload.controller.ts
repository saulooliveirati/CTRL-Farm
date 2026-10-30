import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const ALLOWED_MIME_TYPES = new Set([
  // Imagens
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  // Áudios
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/mp4",
  "audio/x-m4a",
  // Vídeos
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@ApiTags("Suporte Multimídia")
@Controller("support/media")
export class MediaUploadController {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), "storage", "support-media");
    if (!fs.existsSync(this.uploadDir)) {
      try {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      } catch (e) {
        // ignore
      }
    }
  }

  @Post("upload")
  @ApiOperation({ summary: "Upload seguro de fotos, áudios e vídeos para o chat de suporte" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: MAX_FILE_SIZE },
    })
  )
  uploadMedia(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("Nenhum arquivo enviado.");
    }

    const mime = file.mimetype?.toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mime)) {
      throw new BadRequestException(
        `Tipo de arquivo não permitido (${mime}). Formatos aceitos: PNG, JPG, WebP, GIF, WebM, MP3, WAV, MP4.`
      );
    }

    const ext = path.extname(file.originalname) || (mime.startsWith("image/") ? ".jpg" : mime.startsWith("audio/") ? ".webm" : ".mp4");
    const safeName = `${Date.now()}_${crypto.randomBytes(6).toString("hex")}${ext}`;
    const targetPath = path.join(this.uploadDir, safeName);

    fs.writeFileSync(targetPath, file.buffer);

    return {
      success: true,
      url: `/support/media/files/${safeName}`,
      filename: safeName,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  @Get("files/:filename")
  @ApiOperation({ summary: "Serve o arquivo de mídia de suporte com cabeçalho de tipo apropriado" })
  serveFile(@Param("filename") filename: string, @Res() res: Response) {
    // Sanitização contra Directory Traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(this.uploadDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException("Arquivo de mídia não encontrado.");
    }

    const ext = path.extname(safeFilename).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".webp") contentType = "image/webp";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".webm") contentType = "video/webm";
    else if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".mp3") contentType = "audio/mpeg";
    else if (ext === ".wav") contentType = "audio/wav";
    else if (ext === ".ogg") contentType = "audio/ogg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return fs.createReadStream(filePath).pipe(res);
  }
}
