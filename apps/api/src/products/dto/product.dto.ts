import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsInt()
  @Min(0)
  weightGrams?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  dimensions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  sku?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minQuantity?: number;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsInt()
  @Min(0)
  weightGrams?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  dimensions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AdjustStockDto {
  @IsInt()
  delta: number;
}
