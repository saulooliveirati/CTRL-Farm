import { PartialType } from "@nestjs/swagger";

import { CreateInventoryMaterialDto } from "./create-inventory-material.dto.js";

export class UpdateInventoryMaterialDto extends PartialType(CreateInventoryMaterialDto) {}
