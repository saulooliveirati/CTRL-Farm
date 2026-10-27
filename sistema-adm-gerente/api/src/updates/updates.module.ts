import { Module } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { UpdatesController } from "./updates.controller.js";
import { UpdatesService } from "./updates.service.js";

@Module({
  controllers: [UpdatesController],
  providers: [UpdatesService, PrismaService],
  exports: [UpdatesService],
})
export class UpdatesModule {}
