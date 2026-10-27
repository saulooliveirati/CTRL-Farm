import { Global, Module } from "@nestjs/common";
import { CtrlFarmNotifierService } from "./ctrlfarm-notifier.service.js";

@Global()
@Module({
  providers: [CtrlFarmNotifierService],
  exports: [CtrlFarmNotifierService],
})
export class IntegrationsModule {}
