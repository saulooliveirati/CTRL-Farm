import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export enum BillingCycleEnum {
  MONTHLY = "MONTHLY",
  QUARTERLY = "QUARTERLY",
  ANNUAL = "ANNUAL",
}

export enum SubscriptionStatusEnum {
  ATIVO = "ATIVO",
  PENDENTE = "PENDENTE",
  PAUSADO = "PAUSADO",
  SUSPENSO = "SUSPENSO",
  CANCELADO = "CANCELADO",
  EXPIRADO = "EXPIRADO",
}

export class CreateSubscriptionDto {
  @ApiProperty({ description: "ID do Cliente" })
  @IsString()
  @IsNotEmpty()
  clientId: string;

  @ApiProperty({ description: "ID ou código do Plano contratado" })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ enum: BillingCycleEnum, default: BillingCycleEnum.MONTHLY })
  @IsEnum(BillingCycleEnum)
  billingCycle: BillingCycleEnum;

  @ApiPropertyOptional({ example: 39.9, description: "Preço cobrado customizado ou do plano" })
  @IsNumber()
  @IsOptional()
  customPrice?: number;

  @ApiPropertyOptional({ example: "PIX", description: "Forma de pagamento (PIX, CARTAO, BOLETO)" })
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ enum: SubscriptionStatusEnum })
  @IsEnum(SubscriptionStatusEnum)
  @IsOptional()
  status?: SubscriptionStatusEnum;

  @ApiPropertyOptional({ enum: BillingCycleEnum })
  @IsEnum(BillingCycleEnum)
  @IsOptional()
  billingCycle?: BillingCycleEnum;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  currentPrice?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  paymentMethod?: string;
}
