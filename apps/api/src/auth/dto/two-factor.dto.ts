import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class TwoFactorEnableDto {
  @ApiProperty({
    description: "Código TOTP de 6 dígitos gerado pelo aplicativo autenticador",
    example: "123456",
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class TwoFactorDisableDto {
  @ApiProperty({
    description: "Senha atual do usuário para confirmar a desativação da segurança em duas etapas",
    minLength: 6,
    format: "password",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  currentPassword: string;
}
