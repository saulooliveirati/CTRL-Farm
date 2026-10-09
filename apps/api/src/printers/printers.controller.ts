import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";

import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreatePrinterDto } from "./dto/create-printer.dto.js";
import { UpdatePrinterDto } from "./dto/update-printer.dto.js";
import { PrintersService } from "./printers.service.js";

@ApiTags("Printers")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("printers")
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Get()
  @ApiOperation({ summary: "Lista impressoras da empresa autenticada" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.printersService.findAll(user.companyId);
  }

  @Post()
  @ApiOperation({ summary: "Cadastra uma impressora" })
  @ApiCreatedResponse({ description: "Impressora cadastrada." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePrinterDto) {
    return this.printersService.create(user.companyId, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza uma impressora" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePrinterDto) {
    return this.printersService.update(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove uma impressora" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.printersService.remove(user.companyId, id);
  }
}
