import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from "class-validator";

export class LoginDto {
  @ApiProperty({ description: "E-mail cadastrado", format: "email" })
  @IsEmail()
  email: string;

  @ApiProperty({ description: "Senha da conta", minLength: 6, format: "password" })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}