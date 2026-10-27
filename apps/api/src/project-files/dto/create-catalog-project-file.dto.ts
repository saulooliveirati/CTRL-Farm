import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";

export class CreateCatalogProjectFileDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  projectName: string;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsString()
  @MaxLength(40)
  version?: string | null;

  @IsOptional()
  @IsIn(["MODEL", "PROJECTS", "MARKETPLACE", "IDEAS", "DOCUMENTATION", "IMAGE", "OTHER"])
  category?: string;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(50000, { each: true })
  tags?: string[];

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsUUID()
  productionJobId?: string | null;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  externalUrl?: string | null;

  @ValidateIf((_, val) => val != null && val !== "")
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  coverImageUrl?: string | null;
}
