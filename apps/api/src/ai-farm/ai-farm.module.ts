import { Module } from "@nestjs/common";
import { CamerasModule } from "../cameras/cameras.module.js";
import { CustomersModule } from "../customers/customers.module.js";
import { FilamentsModule } from "../filaments/filaments.module.js";
import { InventoryMaterialsModule } from "../inventory-materials/inventory-materials.module.js";
import { OrdersModule } from "../orders/orders.module.js";
import { PricingModule } from "../pricing/pricing.module.js";
import { PrintersModule } from "../printers/printers.module.js";
import { ProductionModule } from "../production/production.module.js";
import { ProjectFilesModule } from "../project-files/project-files.module.js";
import { PrismaModule } from "../database/prisma.module.js";
import { SuppliersModule } from "../suppliers/suppliers.module.js";
import { AiFarmController } from "./ai-farm.controller.js";
import { AiFarmService } from "./ai-farm.service.js";

@Module({
  imports: [
    PrismaModule,
    PrintersModule,
    FilamentsModule,
    CustomersModule,
    SuppliersModule,
    InventoryMaterialsModule,
    OrdersModule,
    ProductionModule,
    PricingModule,
    ProjectFilesModule,
    CamerasModule,
  ],
  controllers: [AiFarmController],
  providers: [AiFarmService],
})
export class AiFarmModule {}
