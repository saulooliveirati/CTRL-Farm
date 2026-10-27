import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateSectionTabDto {
  @IsIn(["EQUIPMENT", "CONTACTS", "INVENTORY"])
  section: "EQUIPMENT" | "CONTACTS" | "INVENTORY";

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  key: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  label: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;
}

export class UpdateSectionTabDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  label?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  icon?: string;

  @IsOptional()
  order?: number;
}
