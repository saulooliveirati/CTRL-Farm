import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { LicensingService } from "./licensing.service.js";
import { CurrentUser } from "../auth/decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard.js";

export class ActivateKeyDto {
  @ApiProperty({ example: "CTRL-FARM-9923-B85E-04F5", description: "Chave RSA oficial de ativação" })
  @IsString()
  @IsNotEmpty()
  activationKey: string;

  @ApiPropertyOptional({ example: "HW-CTRL-FARM-CLIENT" })
  @IsString()
  @IsOptional()
  hardwareFingerprint?: string;
}

export class UpdatePreferenceDto {
  @ApiProperty({ example: true, description: "Habilita verificação automática de atualizações" })
  @IsBoolean()
  autoUpdate: boolean;

  @ApiPropertyOptional({ example: "STABLE", description: "Canal de distribuição (STABLE ou BETA)" })
  @IsString()
  @IsOptional()
  updateChannel?: string;
}

export class RemoteLicenseEventDto {
  @ApiProperty({ example: "CTRL-FARM-9923-B85E-04F5", description: "Chave de ativação da licença" })
  @IsString()
  @IsNotEmpty()
  activationKey: string;

  @ApiProperty({ example: "SUSPENDED", description: "Status determinado pelo Sistema ADM Gerente" })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ example: "SUSPEND", description: "Ação executada (SUSPEND, ACTIVATE, RENEW)" })
  @IsString()
  @IsOptional()
  action?: string;

  @ApiPropertyOptional({ example: "Assinatura suspensa por pagamento pendente no ADM Gerente" })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: "2026-11-26T00:00:00.000Z" })
  @IsString()
  @IsOptional()
  expiresAt?: string;
}

@ApiTags("Licenciamento & Atualizações")
@Controller("licensing")
export class LicensingController {
  constructor(private readonly licensingService: LicensingService) {}

  @Get("status")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Consulta o status da licença ativa, plano e recursos liberados" })
  getStatus(@Req() req: any, @Query("force") force?: string) {
    const user = req.user as AuthenticatedUser | undefined;
    const forceOnline = force === "true" || force === "1";
    return this.licensingService.getStatus(user, forceOnline);
  }

  @Post("revalidate")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Revalida em tempo real o status da assinatura e pagamento com o ADM Gerente" })
  revalidate(@Req() req: any) {
    const user = req.user as AuthenticatedUser | undefined;
    return this.licensingService.revalidateSubscription(user);
  }

  @Post("remote-sync")
  @ApiOperation({ summary: "Recebe notificação remota do Sistema ADM Gerente para sincronização ou suspensão" })
  remoteSync(@Body() dto: RemoteLicenseEventDto) {
    return this.licensingService.applyRemoteLicenseStatus(dto);
  }

  @Post("notify-suspension")
  @ApiOperation({ summary: "Endpoint M2M de suspensão imediata de chave disparado pelo Sistema ADM Gerente" })
  notifySuspension(@Body() dto: RemoteLicenseEventDto) {
    return this.licensingService.applyRemoteLicenseStatus({
      ...dto,
      status: "SUSPENDED",
      action: "SUSPEND",
    });
  }

  @Post("activate")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Ativa uma nova chave de licença associando à conta do usuário" })
  activate(@Body() dto: ActivateKeyDto, @Req() req: any) {
    const user = req.user as AuthenticatedUser | undefined;
    return this.licensingService.activateLicense(dto.activationKey, user, dto.hardwareFingerprint);
  }

  @Post("preferences")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Define preferências de atualização automática do CTRL-Farm" })
  updatePreferences(
    @Body() dto: UpdatePreferenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.licensingService.updateAutoUpdatePreference(
      user.id,
      dto.autoUpdate,
      dto.updateChannel,
    );
  }

  @Get("updates")
  @ApiOperation({ summary: "Consulta o Sistema ADM Gerente para saber se há novas versões disponíveis" })
  checkUpdates(@Query("version") version?: string) {
    return this.licensingService.checkForUpdates(version || "v2.5.0");
  }
}
