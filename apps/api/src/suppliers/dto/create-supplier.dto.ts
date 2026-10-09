import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateSupplierDto {
  @ApiProperty({ example: "Filamentos Brasil" })
  @IsString() @MinLength(2) @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: "12.345.678/0001-90" })
  @IsOptional() @IsString() @MaxLength(30)
  document?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail() @MaxLength(160)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(240)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(500)
  notes?: string;
}
