import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AiFarmModule } from "./ai-farm/ai-farm.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CamerasModule } from "./cameras/cameras.module.js";
import { CommonModule } from "./common/common.module.js";
import { CompaniesModule } from "./companies/companies.module.js";
import { validateEnvironment } from "./config/env.validation.js";
import { CustomersModule } from "./customers/customers.module.js";
import { PrismaModule } from "./database/prisma.module.js";
import { EquipmentModule } from "./equipment/equipment.module.js";
import { FilamentsModule } from "./filaments/filaments.module.js";
import { InventoryMaterialsModule } from "./inventory-materials/inventory-materials.module.js";
import { LgpdModule } from "./lgpd/lgpd.module.js";
import { LicensingModule } from "./licensing/licensing.module.js";
import { MarketplaceModule } from "./marketplace/marketplace.module.js";
import { FirebaseModule } from "./firebase/firebase.module.js";
import { ConsignmentsModule } from "./consignments/consignments.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { PricingModule } from "./pricing/pricing.module.js";
import { PrintersModule } from "./printers/printers.module.js";
import { ProductionModule } from "./production/production.module.js";
import { ProductsModule } from "./products/products.module.js";
import { ProjectFilesModule } from "./project-files/project-files.module.js";
import { SectionTabsModule } from "./section-tabs/section-tabs.module.js";
import { SuppliersModule } from "./suppliers/suppliers.module.js";
import { TelemetryModule } from "./telemetry/telemetry.module.js";
import { UsersModule } from "./users/users.module.js";

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
    SuppliersModule,
    InventoryMaterialsModule,
    ProjectFilesModule,
    PricingModule,
    CamerasModule,
    AiFarmModule,
    TelemetryModule,
    SectionTabsModule,
    EquipmentModule,
    ProductsModule,
    LgpdModule,
    MarketplaceModule,
    LicensingModule,
    FirebaseModule,
    ConsignmentsModule,
  ],
})
export class AppModule {}
