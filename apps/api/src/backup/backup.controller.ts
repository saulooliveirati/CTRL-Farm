import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Res,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { BackupService, type BackupExportData } from "./backup.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";

@ApiTags("Backup do Serviço")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("backup")
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get("export")
  @ApiOperation({ summary: "Exporta backup completo dos dados do serviço em formato JSON" })
  async exportBackup(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    if (!user.companyId) {
      throw new BadRequestException("Usuário não possui uma empresa vinculada para exportar backup.");
    }

    const backupData = await this.backupService.exportFullBackup(user.companyId);

    const nowStr = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `ctrlfarm-backup-${nowStr}.json`;

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(JSON.stringify(backupData, null, 2));
  }

  @Post("restore")
  @ApiOperation({ summary: "Restaura os dados a partir de um arquivo de backup completo (.json)" })
  async restoreBackup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: BackupExportData
  ) {
    if (user.role !== "ADMIN") {
      throw new ForbiddenException(
        "Apenas usuários Administradores possuem permissão para restaurar backups do sistema."
      );
    }

    if (!user.companyId) {
      throw new BadRequestException("Usuário não possui uma empresa vinculada.");
    }

    return this.backupService.restoreBackup(user.companyId, body);
  }
}
