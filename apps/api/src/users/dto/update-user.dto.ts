import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateUserDto {
  @ApiPropertyOptional({ example: "Saulo Silva", description: "Nome completo do usuário" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: "saulo@ctrlfarm.com.br", description: "E-mail de acesso" })
  @IsOptional()
  @IsEmail()
  email?: string;
}
