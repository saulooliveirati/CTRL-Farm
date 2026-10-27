import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "./audit/audit.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { ClientsModule } from "./clients/clients.module.js";
import { DashboardModule } from "./dashboard/dashboard.module.js";
import { LicensesModule } from "./licenses/licenses.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { PlansModule } from "./plans/plans.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { SubscriptionsModule } from "./subscriptions/subscriptions.module.js";
import { UpdatesModule } from "./updates/updates.module.js";
import { FirebaseModule } from "./firebase/firebase.module.js";
import { IntegrationsModule } from "./integrations/integrations.module.js";
import { EmailModule } from "./email/email.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "sistema-adm-gerente/.env"],
    }),
    AuthModule,
    DashboardModule,
    ClientsModule,
    PlansModule,
    SubscriptionsModule,
    LicensesModule,
    UpdatesModule,
    AuditModule,
    SettingsModule,
    PaymentsModule,
    FirebaseModule,
    IntegrationsModule,
    EmailModule,
  ],
})
export class AppModule {}
