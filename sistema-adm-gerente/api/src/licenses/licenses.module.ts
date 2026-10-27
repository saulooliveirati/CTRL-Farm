import { Module } from "@nestjs/common";
import { RsaService } from "../crypto/rsa.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { LicensesController } from "./licenses.controller.js";
import { LicensesService } from "./licenses.service.js";

@Module({
  controllers: [LicensesController],
  providers: [LicensesService, RsaService, PrismaService],
  exports: [LicensesService],
})
export class LicensesModule {}
