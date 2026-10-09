import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

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

  @ApiPropertyOptional({ enum: PrinterStatus, default: PrinterStatus.OFFLINE })
  @IsOptional()
  @IsEnum(PrinterStatus)
  status?: PrinterStatus;

  @ApiPropertyOptional({ description: "Fornecedor do equipamento" })
  @IsOptional() @IsUUID()
  supplierId?: string | null;
}
