import { Module, Global } from "@nestjs/common";
import { LicensingController } from "./licensing.controller.js";
import { LicensingService } from "./licensing.service.js";
import { SubscriptionGuard } from "./subscription.guard.js";
import { PrismaModule } from "../database/prisma.module.js";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [LicensingController],
  providers: [LicensingService, SubscriptionGuard],
  exports: [LicensingService, SubscriptionGuard],
})
export class LicensingModule {}
