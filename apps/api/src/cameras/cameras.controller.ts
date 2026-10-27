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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { CreateCameraDto } from "./dto/create-camera.dto.js";
import { UpdateCameraDto } from "./dto/update-camera.dto.js";
import { CamerasService } from "./cameras.service.js";

@ApiTags("Cameras")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cameras")
export class CamerasController {
  constructor(private readonly cameras: CamerasService) {}
  @Get()
  @ApiOperation({ summary: "Lista câmeras cadastradas na empresa" })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.cameras.findAll(user.companyId);
  }
  @Post()
  @ApiOperation({ summary: "Cadastra uma câmera Tapo local" })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCameraDto) {
    return this.cameras.create(user.companyId, dto);
  }
  @Patch(":id")
  @ApiOperation({ summary: "Atualiza câmera e reconecta o fluxo" })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCameraDto,
  ) {
    return this.cameras.update(user.companyId, id, dto);
  }
  @Post(":id/reconnect")
  @ApiOperation({ summary: "Reaplica a configuração do fluxo ao vivo" })
  reconnect(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.cameras.reconnect(user.companyId, id);
  }
  @Get(":id/test")
  @ApiOperation({ summary: "Testa a conectividade e autenticação de uma câmera cadastrada" })
  testConnection(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.cameras.testConnection(user.companyId, id);
  }
  @Post("test")
  @ApiOperation({ summary: "Testa credenciais de uma câmera antes de cadastrar" })
  testDraft(@CurrentUser() _user: AuthenticatedUser, @Body() dto: CreateCameraDto) {
    return this.cameras.testDraftConnection(dto);
  }
  @Delete(":id")
  @ApiOperation({ summary: "Remove uma câmera" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) {
    return this.cameras.remove(user.companyId, id);
  }
}
