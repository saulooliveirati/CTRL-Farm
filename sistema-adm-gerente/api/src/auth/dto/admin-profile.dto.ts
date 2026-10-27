import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({ example: "Administrador Geral", description: "Nome completo do administrador" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: "admin", description: "Nome de usuário de acesso" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  username?: string;

  @ApiPropertyOptional({ example: "admin@ctrlfarm.com.br", description: "E-mail para login e recuperação de senha" })
  @IsOptional()
  @IsEmail({}, { message: "Formato de e-mail inválido." })
  email?: string;
}

export class ChangeAdminPasswordDto {
  @ApiProperty({ example: "SenhaAtual123!", description: "Senha atual do administrador" })
  @IsString()
  @IsNotEmpty({ message: "A senha atual é obrigatória." })
  currentPassword!: string;

  @ApiProperty({ example: "NovaSenhaForte2026!", description: "Nova senha desejada (mínimo 6 caracteres)" })
  @IsString()
  @MinLength(6, { message: "A nova senha deve possuir no mínimo 6 caracteres." })
  newPassword!: string;
}

export class ForgotPasswordRequestDto {
  @ApiProperty({ example: "admin@ctrlfarm.com.br", description: "E-mail cadastrado do administrador para recuperação" })
  @IsEmail({}, { message: "Formato de e-mail inválido." })
  @IsNotEmpty({ message: "O e-mail é obrigatório." })
  email!: string;
}
