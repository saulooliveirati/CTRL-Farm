import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";
import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength, MinLength } from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "Carlos Oliveira", description: "Nome completo do usuário" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: "carlos@farm3d.com.br", description: "E-mail de acesso institucional" })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "Senha@123",
    description: "Senha provisória ou definitiva de acesso",
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(100)
  password!: string;

  @ApiProperty({
    enum: UserRole,
    example: UserRole.OPERATOR,
    description: "Nível de acesso (ADMIN, MANAGER, OPERATOR, VIEWER)",
  })
  @IsEnum(UserRole)
  role!: UserRole;
}
