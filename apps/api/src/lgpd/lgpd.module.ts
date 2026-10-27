import { Module } from "@nestjs/common";
import { LgpdController } from "./lgpd.controller.js";
import { LgpdService } from "./lgpd.service.js";

@Module({
  controllers: [LgpdController],
  providers: [LgpdService],
  exports: [LgpdService],
})
export class LgpdModule {}
