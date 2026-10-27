import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { AdminUpdateUserDto } from "./dto/admin-update-user.dto.js";
import { ChangePasswordDto } from "./dto/change-password.dto.js";
import { CreateUserDto } from "./dto/create-user.dto.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { UsersService } from "./users.service.js";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Lista todos os usuários da empresa" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findAll(user.companyId);
  }

  @Post()
  @ApiOperation({ summary: "Cadastra um novo usuário na empresa (Exclusivo Administrador)" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateUserDto) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException(
        "Apenas usuários com nível Administrador podem cadastrar novos usuários no sistema.",
      );
    }
    return this.usersService.create(user.companyId, dto);
  }

  @Get("me")
  @ApiOperation({ summary: "Retorna o perfil completo do usuário autenticado" })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMe(user.id);
  }

  @Patch("me")
  @ApiOperation({ summary: "Atualiza os dados cadastrais do próprio usuário (nome, e-mail)" })
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Post("me/change-password")
  @ApiOperation({ summary: "Altera a senha do usuário autenticado" })
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza permissões ou dados de um usuário (Exclusivo Administrador)" })
  adminUpdate(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException(
        "Apenas usuários com nível Administrador podem editar outros usuários.",
      );
    }
    return this.usersService.adminUpdate(user.companyId, id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Remove um usuário da empresa (Exclusivo Administrador)" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException(
        "Apenas usuários com nível Administrador podem excluir usuários do sistema.",
      );
    }
    return this.usersService.remove(user.companyId, id, user.id);
  }
}
