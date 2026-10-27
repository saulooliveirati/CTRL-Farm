import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ description: "E-mail cadastrado", format: "email" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Senha da conta", minLength: 6, format: "password" })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({
    description: "Código de autenticação em duas etapas (TOTP de 6 dígitos ou código de backup)",
    example: "123456",
  })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
