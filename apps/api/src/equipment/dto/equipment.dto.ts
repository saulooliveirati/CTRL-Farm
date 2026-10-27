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

export class CreateEquipmentDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  tabKey: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsInt()
  @Min(0)
  powerWatts?: number;

  @IsOptional()
  @IsString()
  acquisitionDate?: string;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEquipmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  tabKey?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  serialNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsInt()
  @Min(0)
  powerWatts?: number;

  @IsOptional()
  @IsString()
  acquisitionDate?: string;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyCost?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
