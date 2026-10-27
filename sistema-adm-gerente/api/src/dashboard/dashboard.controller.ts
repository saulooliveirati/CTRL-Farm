import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAdminAuthGuard } from "../auth/jwt-auth.guard.js";
import { DashboardService } from "./dashboard.service.js";

@ApiTags("Dashboard Analítico")
@ApiBearerAuth()
@UseGuards(JwtAdminAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: "Retorna todos os KPIs, gráficos e resumos consolidados do sistema" })
  getDashboard() {
    return this.dashboardService.getMetrics();
  }

  @Get("metrics")
  @ApiOperation({ summary: "Retorna todos os KPIs, gráficos e resumos consolidados do sistema" })
  getMetrics() {
    return this.dashboardService.getMetrics();
  }
}
