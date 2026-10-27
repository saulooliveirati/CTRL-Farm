import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InventoryCategory } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateInventoryMaterialDto {
  @ApiProperty({ example: "Bico de latão 0,4 mm" })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: InventoryCategory })
  @IsEnum(InventoryCategory)
  category!: InventoryCategory;

  @ApiProperty({ example: "un" })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  unit!: string;

  @ApiPropertyOptional({ example: "BICO-04" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @ApiPropertyOptional({ example: 4 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999)
  currentQuantity?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  @Max(999999999)
  minimumQuantity?: number;

  @ApiPropertyOptional({ example: 25.9 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  supplierId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
