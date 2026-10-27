import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreatePricingEstimateDto } from "./dto/create-pricing-estimate.dto.js";
import { PricingService } from "./pricing.service.js";

@ApiTags("Pricing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("pricing-estimates")
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Get()
  @ApiOperation({ summary: "Lista simulações de preço salvas pela empresa" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.pricing.findAll(user.companyId);
  }

  @Post()
  @ApiCreatedResponse({ description: "Simulação calculada e salva." })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePricingEstimateDto) {
    return this.pricing.create(user.companyId, dto);
  }

  @Delete(":id")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.pricing.remove(user.companyId, id);
  }
}
