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
import { CreateFilamentDto } from "./dto/create-filament.dto.js";
import { UpdateFilamentDto } from "./dto/update-filament.dto.js";
import { FilamentsService } from "./filaments.service.js";

@ApiTags("Filaments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("filaments")
export class FilamentsController {
  constructor(private readonly filamentsService: FilamentsService) {}

  @Get()
  @ApiOperation({ summary: "Lista filamentos da empresa autenticada" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.filamentsService.findAll(user.companyId);
  }

  @Post()
  @ApiOperation({ summary: "Cadastra uma bobina de filamento" })
  @ApiCreatedResponse({ description: "Filamento cadastrado." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateFilamentDto) {
    return this.filamentsService.create(user.companyId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza os dados ou o peso disponível de uma bobina" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateFilamentDto,
  ) {
    return this.filamentsService.update(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove uma bobina" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.filamentsService.remove(user.companyId, id);
  }
}
