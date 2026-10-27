import { Module } from "@nestjs/common";
import { ProjectFilesController } from "./project-files.controller.js";
import { ProjectFilesService } from "./project-files.service.js";

@Module({
  controllers: [ProjectFilesController],
  providers: [ProjectFilesService],
  exports: [ProjectFilesService],
})
export class ProjectFilesModule {}
