import { Module } from "@nestjs/common";
import { PrismaService } from "../database/prisma.service.js";
import { ClientsController } from "./clients.controller.js";
import { ClientsService } from "./clients.service.js";
import { LicensesModule } from "../licenses/licenses.module.js";
import { EmailModule } from "../email/email.module.js";
import { IntegrationsModule } from "../integrations/integrations.module.js";
import { FirebaseModule } from "../firebase/firebase.module.js";

@Module({
  imports: [LicensesModule, EmailModule, IntegrationsModule, FirebaseModule],
  controllers: [ClientsController],
  providers: [ClientsService, PrismaService],
  exports: [ClientsService],
})
export class ClientsModule {}
