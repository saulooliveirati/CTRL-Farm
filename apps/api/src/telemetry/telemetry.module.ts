import { Module } from "@nestjs/common";
import { PrismaModule } from "../database/prisma.module.js";
import { TelemetryController } from "./telemetry.controller.js";
import { TelemetryService } from "./telemetry.service.js";

@Module({
  imports: [PrismaModule],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
