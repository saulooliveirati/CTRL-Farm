import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FilamentMaterial } from "@prisma/client";
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateFilamentDto {
  @ApiProperty({ enum: FilamentMaterial })
  @IsEnum(FilamentMaterial)
  material!: FilamentMaterial;

  @ApiProperty({ example: "Voolt3D" })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  brand!: string;

  @ApiProperty({ example: "Preto" })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  color!: string;

  @ApiProperty({ example: 1000, description: "Peso inicial em gramas" })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  initialWeightG!: number;

  @ApiPropertyOptional({ example: 850, description: "Peso atual em gramas" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentWeightG?: number;

  @ApiPropertyOptional({ example: 89.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  price?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lot?: string;

  @ApiPropertyOptional({ example: "2026-10-09" })
  @IsOptional()
  @IsDateString()
  purchasedAt?: string;

  @ApiPropertyOptional({ description: "Fornecedor da bobina" })
  @IsOptional()
  @IsUUID()
  supplierId?: string | null;
}
