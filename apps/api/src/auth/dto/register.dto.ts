import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from "class-validator";

export class RegisterDto {
  @ApiProperty({ description: "Nome da empresa" })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: "Nome do primeiro administrador" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "E-mail de acesso", format: "email" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Senha de acesso", minLength: 6, format: "password" })
  @IsString()
  @MinLength(6)
  password: string;
}