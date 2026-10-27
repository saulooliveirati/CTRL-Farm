import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

import { PrinterStatus } from "@prisma/client";

export class CreatePrinterDto {
  @ApiProperty({ example: "Bambu X1 Carbon" })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: "Bambu Lab" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  manufacturer?: string;

  @ApiPropertyOptional({ example: "X1 Carbon" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiPropertyOptional({ example: "Bancada 1" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({ example: 0.4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.1)
  @Max(2)
  nozzleMm?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  @Max(16)
  extruderCount?: number;

  @ApiPropertyOptional({
    example: true,
    description: "Indica se a impressora possui sistema AMS/multimaterial",
  })
  @IsOptional()
  @IsBoolean()
  hasAms?: boolean;

  @ApiPropertyOptional({ example: 125.5 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1000000)
  usageHours?: number;

  @ApiPropertyOptional({
    description: "URL externa ou imagem comprimida enviada pelo navegador",
    maxLength: 92000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(92000)
  @Matches(/^(https?:\/\/[^\s]+|data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+)$/i)
  imageUrl?: string | null;

  @ApiPropertyOptional({ enum: PrinterStatus, default: PrinterStatus.OFFLINE })
  @IsOptional()
  @IsEnum(PrinterStatus)
  status?: PrinterStatus;

  @ApiPropertyOptional({ description: "Fornecedor do equipamento" })
  @IsOptional()
  @IsUUID()
  supplierId?: string | null;
}
