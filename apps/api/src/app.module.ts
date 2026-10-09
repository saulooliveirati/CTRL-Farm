import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module.js";
import { CompaniesModule } from "./companies/companies.module.js";
import { UsersModule } from "./users/users.module.js";
import { CommonModule } from "./common/common.module.js";
import { PrismaModule } from "./database/prisma.module.js";
import { validateEnvironment } from "./config/env.validation.js";
import { PrintersModule } from "./printers/printers.module.js";
import { FilamentsModule } from "./filaments/filaments.module.js";
import { ProductionModule } from "./production/production.module.js";
import { CustomersModule } from "./customers/customers.module.js";
import { OrdersModule } from "./orders/orders.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: "../../.env",
      validate: validateEnvironment,
    }),

    PrismaModule,

    CommonModule,
    AuthModule,
    UsersModule,
    CompaniesModule,
    PrintersModule,
    FilamentsModule,
    ProductionModule,
    CustomersModule,
    OrdersModule,
  ],
})
export class AppModule {}
