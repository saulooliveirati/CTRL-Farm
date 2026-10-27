import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateCompanyDto {
  @ApiPropertyOptional({
    example: "CTRL+Farm Tecnologia Ltda",
    description: "Razão social / Nome completo",
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: "CTRL+Farm 3D Lab", description: "Nome fantasia / Operacional" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  tradeName?: string;

  @ApiPropertyOptional({ example: "12.345.678/0001-90", description: "Número de CPF ou CNPJ" })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  document?: string;

  @ApiPropertyOptional({
    example: "contato@ctrlfarm.com.br",
    description: "E-mail de contato corporativo",
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: "(11) 98765-4321",
    description: "Telefone / WhatsApp corporativo",
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}
