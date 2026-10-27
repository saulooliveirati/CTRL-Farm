import { Module } from "@nestjs/common";

import { FilamentsController } from "./filaments.controller.js";
import { FilamentsService } from "./filaments.service.js";

@Module({
  controllers: [FilamentsController],
  providers: [FilamentsService],
  exports: [FilamentsService],
})
export class FilamentsModule {}
