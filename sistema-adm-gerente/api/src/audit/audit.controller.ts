import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAdminAuthGuard } from "../auth/jwt-auth.guard.js";
import { AuditService } from "./audit.service.js";

@ApiTags("Auditoria & Segurança")
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: "Consulta o registro completo de auditoria do sistema" })
  findAll(@Query("action") action?: string, @Query("limit") limit?: string) {
    return this.auditService.findAll({
      action,
      limit: limit ? Number(limit) : 50,
    });
  }
}
