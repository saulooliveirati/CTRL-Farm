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
import { AdjustStockDto, CreateProductDto, UpdateProductDto } from "./dto/product.dto.js";
import { ProductsService } from "./products.service.js";

function ensureCanManage(user: AuthenticatedUser) {
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    throw new ForbiddenException(
      "Apenas Administradores e Moderadores possuem permissão para cadastrar ou excluir produtos.",
    );
  }
}

@ApiTags("Products")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOperation({ summary: "Lista produtos acabados em estoque" })
  findAll(@CurrentUser() user: AuthenticatedUser, @Query("search") search?: string) {
    return this.products.findAll(user.companyId, search);
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtém detalhes de um produto" })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.products.findOne(user.companyId, id);
  }

  @Post()
  @ApiOperation({ summary: "Cadastra novo produto no estoque" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateProductDto) {
    ensureCanManage(user);
    return this.products.create(user.companyId, dto);
  }

  @Patch(":id/stock")
  @ApiOperation({ summary: "Ajuste rápido de quantidade em estoque (+1, -1, etc)" })
  adjustStock(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AdjustStockDto,
  ) {
    // Operador, moderador e admin podem dar baixa ou entrada no estoque físico
    return this.products.adjustStock(user.companyId, id, dto.delta);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza informações do produto" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Exclui um produto do estoque" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    ensureCanManage(user);
    return this.products.remove(user.companyId, id);
  }
}
