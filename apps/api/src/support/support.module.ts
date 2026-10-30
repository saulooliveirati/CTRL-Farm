import { Module } from "@nestjs/common";
import { SupportController } from "./support.controller.js";
import { MediaUploadController } from "./media-upload.controller.js";
import { SupportService } from "./support.service.js";
import { SupportAiService } from "./support-ai.service.js";
import { SupportGateway } from "./support.gateway.js";
import { PrismaModule } from "../database/prisma.module.js";

@Module({
  imports: [PrismaModule],
  controllers: [SupportController, MediaUploadController],
  providers: [SupportService, SupportAiService, SupportGateway],
  exports: [SupportService, SupportAiService, SupportGateway],
})
export class SupportModule {}
