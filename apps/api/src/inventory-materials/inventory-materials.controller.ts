import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreateInventoryMaterialDto } from "./dto/create-inventory-material.dto.js";
import { UpdateInventoryMaterialDto } from "./dto/update-inventory-material.dto.js";
import { InventoryMaterialsService } from "./inventory-materials.service.js";

@ApiTags("Inventory materials")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("inventory-materials")
export class InventoryMaterialsController {
  constructor(private readonly materialsService: InventoryMaterialsService) {}

  @Get()
  @ApiOperation({ summary: "Lista insumos, equipamentos e outros materiais" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.materialsService.findAll(user.companyId);
  }

  @Post()
  @ApiOperation({ summary: "Cadastra material ou equipamento" })
  @ApiCreatedResponse({ description: "Material cadastrado." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateInventoryMaterialDto) {
    return this.materialsService.create(user.companyId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza material ou saldo do estoque" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateInventoryMaterialDto,
  ) {
    return this.materialsService.update(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove um item do estoque" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.materialsService.remove(user.companyId, id);
  }
}
