import { Module } from "@nestjs/common";

import { InventoryMaterialsController } from "./inventory-materials.controller.js";
import { InventoryMaterialsService } from "./inventory-materials.service.js";

@Module({
  controllers: [InventoryMaterialsController],
  providers: [InventoryMaterialsService],
  exports: [InventoryMaterialsService],
})
export class InventoryMaterialsModule {}
