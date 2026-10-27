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
import { CreateProductionDto } from "./dto/create-production.dto.js";
import { UpdateProductionDto } from "./dto/update-production.dto.js";
import { ProductionService } from "./production.service.js";

@ApiTags("Production")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("production")
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Get()
  @ApiOperation({ summary: "Lista ordens de produção da empresa" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.productionService.findAll(user.companyId);
  }

  @Post()
  @ApiOperation({ summary: "Cria uma ordem de produção" })
  @ApiCreatedResponse({ description: "Ordem criada na fila." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductionDto) {
    return this.productionService.create(user.companyId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Avança o status de uma ordem de produção" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductionDto,
  ) {
    return this.productionService.update(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove produção sem histórico operacional" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.productionService.remove(user.companyId, id);
  }
}
