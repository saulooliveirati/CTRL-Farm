import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAdminAuthGuard } from "../auth/jwt-auth.guard.js";
import { PlansService } from "./plans.service.js";

@ApiTags("Planos & Preços")
@Controller("plans")
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: "Lista todos os planos do CTRL-Farm (Starter, Professional, Business, etc.)" })
  findAll(@Query("includePrivate") includePrivate?: string) {
    const showPrivate = includePrivate !== "false";
    return this.plansService.findAll(showPrivate);
  }

  @Get(":codeOrId")
  @UseGuards(JwtAdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Obtém detalhes do plano por ID ou código" })
  findOne(@Param("codeOrId") codeOrId: string) {
    if (codeOrId.length === 36 && codeOrId.includes("-")) {
      return this.plansService.findById(codeOrId);
    }
    return this.plansService.findByCode(codeOrId);
  }
}
