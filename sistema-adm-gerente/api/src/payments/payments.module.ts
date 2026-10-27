import { Module } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { PaymentsController } from "./payments.controller.js";
import { PaymentsService } from "./payments.service.js";
import { LicensesModule } from "../licenses/licenses.module.js";

@Module({
  imports: [LicensesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
