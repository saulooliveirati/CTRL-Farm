import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class GenerateLicenseDto {
  @ApiProperty({ description: "ID do cliente" })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: "ID ou código do plano (STARTER, PROFESSIONAL, BUSINESS, ENTERPRISE, TRIAL, UNLIMITED_OWNER)" })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiPropertyOptional({ description: "ID da assinatura vinculada" })
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @ApiPropertyOptional({ enum: ["MONTHLY", "QUARTERLY", "ANNUAL"], description: "Ciclo de faturamento da assinatura se nova" })
  @IsString()
  @IsOptional()
  billingCycle?: "MONTHLY" | "QUARTERLY" | "ANNUAL";

  @ApiPropertyOptional({ description: "Forma de pagamento da assinatura vinculada (PIX, CARTAO, BOLETO, CORTESIA)" })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: "Preço negociado personalizado para a assinatura" })
  @IsNumber()
  @IsOptional()
  customPrice?: number;

  @ApiPropertyOptional({ example: 365, description: "Validade em dias (padrão 365 dias, ou 7 para trial, ou -1 para vitalício)" })
  @IsNumber()
  @IsOptional()
  validityDays?: number;

  @ApiPropertyOptional({ description: "Data de expiração específica" })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ description: "Customização de recursos adicionais para o cliente" })
  @IsOptional()
  customFeatures?: Record<string, any>;
}

export class ActivateLicenseDto {
  @ApiProperty({ example: "CTRL-FARM-9923-B85E-04F5", description: "Chave de ativação fornecida pelo proprietário" })
  @IsString()
  @IsNotEmpty()
  activationKey: string;

  @ApiPropertyOptional({ example: "HW-FARM-9988-BAMBU", description: "Fingerprint do hardware da instalação do cliente" })
  @IsString()
  @IsOptional()
  hardwareFingerprint?: string;

  @ApiPropertyOptional({ example: "v2.5.0", description: "Versão do software CTRL-Farm em execução" })
  @IsString()
  @IsOptional()
  clientVersion?: string;

  @ApiPropertyOptional({ example: "INST-01", description: "Identificador da instância" })
  @IsString()
  @IsOptional()
  instanceId?: string;
}

export class ValidateLicenseDto {
  @ApiProperty({ example: "CTRL-FARM-9923-B85E-04F5" })
  @IsString()
  @IsNotEmpty()
  activationKey: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  hardwareFingerprint?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientVersion?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instanceId?: string;
}

export class RevokeLicenseDto {
  @ApiProperty({ example: "Inadimplência ou cancelamento contratual." })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
