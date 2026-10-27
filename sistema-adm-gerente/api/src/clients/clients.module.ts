import { Module } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { ClientsController } from "./clients.controller.js";
import { ClientsService } from "./clients.service.js";

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService],
  exports: [ClientsService],
})
export class ClientsModule {}
