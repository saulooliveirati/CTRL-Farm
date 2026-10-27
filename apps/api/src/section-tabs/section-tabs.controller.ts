import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreateSectionTabDto, UpdateSectionTabDto } from "./dto/section-tab.dto.js";
import { SectionTabsService } from "./section-tabs.service.js";

function ensureCanManage(user: AuthenticatedUser) {
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    throw new ForbiddenException(
      "Apenas Administradores e Moderadores podem criar, editar, reordenar ou excluir abas.",
    );
  }
}

@ApiTags("Section Tabs")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("section-tabs")
export class SectionTabsController {
  constructor(private readonly tabs: SectionTabsService) {}

  @Get()
  @ApiOperation({ summary: "Lista abas ativas e customizadas de uma seção ou de todas as seções" })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query("section") section?: string | string[],
  ) {
    const rawSection = Array.isArray(section) ? section[0] : section;
    const normalized = (rawSection?.trim().toUpperCase() ?? "ALL") as
      | "EQUIPMENT"
      | "CONTACTS"
      | "INVENTORY"
      | "ALL";
    return this.tabs.findAll(user.companyId, normalized);
  }

  @Post()
  @ApiOperation({ summary: "Cadastra nova aba customizada para uma seção" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSectionTabDto) {
    ensureCanManage(user);
    return this.tabs.create(user.companyId, dto);
  }

  @Patch("reorder")
  @ApiOperation({ summary: "Reordena abas de uma seção" })
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      section: "EQUIPMENT" | "CONTACTS" | "INVENTORY";
      items: Array<{ key: string; order: number }>;
    },
  ) {
    ensureCanManage(user);
    return this.tabs.reorder(user.companyId, body.section, body.items);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Edita uma aba customizada" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSectionTabDto,
  ) {
    ensureCanManage(user);
    return this.tabs.update(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Exclui uma aba customizada" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    ensureCanManage(user);
    return this.tabs.remove(user.companyId, id);
  }
}
